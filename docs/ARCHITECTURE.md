# Architecture

Four Adyen TEST playgrounds in one Deno workspace. They share a server library, a UI library and a
build pipeline, and each deploys on its own.

Read this before changing anything that crosses an app boundary. For what the playgrounds
deliberately do _not_ do, see [KNOWN_LIMITS.md](KNOWN_LIMITS.md); for the trust model, see
[SECURITY.md](SECURITY.md).

## The shape of it

```
payments-playground/
├── apps/                        four independent servers, plus the landing page
│   ├── adyen-digital/           online checkout: sessions, advanced, API-only, MIT, pay-by-link
│   ├── adyen-ipp-endless-aisle/ in-person payments against a Cloud terminal
│   ├── adyen-agentic-commerce/  agent-initiated purchases over a delegated-token flow
│   ├── adyen-v6-styling/        Drop-in theming workbench (no orders, no back office)
│   └── landing/                 static front door linking to the four (no build step)
├── packages/
│   ├── platform/                everything server-side and shared: Adyen calls, SQLite, security
│   └── ui/                      Preact components, design tokens, client-side payment-method setup
├── scripts/                     dev/build/start orchestration and release checks
├── docs/                        this file, SECURITY.md, KNOWN_LIMITS.md
├── data/                        SQLite files (git-ignored, created on first run)
├── deno.json                    workspace members, shared imports, all root tasks
└── render.yaml                  the deployment blueprint for all four services
```

`deno.json` at the root is the only place dependency versions are pinned. Apps inherit them through
the workspace, so `@adyen/adyen-web` is one version everywhere, worth keeping that way, since the
SDK version is baked into the UI copy and into the token audit test.

## The landing page

`apps/landing/` is plain HTML and CSS, no framework, no build, no server. It only lists the four
playgrounds and says what they are, which is not work a runtime should be doing; keeping it static
means it costs nothing to host and cannot quietly grow into a fifth app.

The four destination URLs sit in one block at the top of `index.html`. Nothing links back from a
playground to the landing: every brand link inside an app is `href="/"`, so a visitor on a subdomain
stays on that subdomain.

It carries its own wordmark rather than Adyen's, a logo is a claim of identity, and these
playgrounds are not Adyen's.

## How one app is put together

Every app is the same six pieces. Learn one and you know all four.

| File / folder    | What it does                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `main.ts`        | Creates the Fresh app, mounts the Hono API router, applies security middleware, starts the server. |
| `api.ts`         | Every `/api/*` route for this app. Talks to Adyen and to SQLite; nothing here reaches the browser. |
| `routes/`        | Fresh pages, server-rendered. `_app.tsx` is the shared shell.                                      |
| `islands/`       | The interactive parts, hydrated in the browser. This is where the Adyen Web SDK is mounted.        |
| `components/`    | Presentational pieces and per-app option catalogues. No network calls.                             |
| `assets/app.css` | App-specific CSS layered on top of `packages/ui/styles.css`.                                       |

**One process, two frameworks.** Fresh 2 renders the pages, Hono serves the API, and both run in the
same server. It avoids a second runtime and a proxy hop for what is, in the end, one deployable per
playground.

**Islands are the boundary that matters.** Anything under `islands/` ships to the browser. Server
secrets live behind `api.ts` and are never imported from an island, see [SECURITY.md](SECURITY.md).

## What the shared packages hold

### `packages/platform`: server only

Never import this from an island. It reaches SQLite, Adyen credentials and the filesystem.

| Module                                            | Responsibility                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `adyen.ts`                                        | The only path to Adyen. Wraps the official `@adyen/api-library` and refuses non-TEST endpoints. |
| `base-api.ts`                                     | The Hono routes every app shares: bootstrap, profile, health.                                   |
| `config.ts`                                       | Reads and validates environment variables.                                                      |
| `profiles.ts`                                     | Merchant profiles, encrypted at rest.                                                           |
| `storage.ts`, `migrations/`                       | SQLite access and schema migrations.                                                            |
| `security.ts`                                     | CSRF, rate limiting, security headers, optional Basic Auth.                                     |
| `hmac.ts`                                         | Webhook signature validation.                                                                   |
| `sanitize.ts`                                     | Redacts secrets and rejects raw card data before anything is logged.                            |
| `state-machine.ts`, `lifecycle.ts`                | Order/attempt states and which lifecycle actions are legal.                                     |
| `markets.ts`                                      | Country → currency, locale, and a presentable default amount.                                   |
| `addresses.ts`, `shopper.ts`, `sessionContext.ts` | TEST shopper and address data per market.                                                       |
| `payment-methods.ts`                              | Per-method capabilities, editable without touching flow code.                                   |
| `test-only.ts`                                    | The guard that makes a LIVE endpoint unreachable.                                               |

`markets.ts` is shared deliberately: the styling playground and the digital one have to agree on
what a Brazilian checkout looks like, and they only do because there is exactly one table.

### `packages/ui`: safe for the browser

Design tokens and shell components (`styles.css`, `components.tsx`), the fetch helper that attaches
the CSRF token (`client.ts`), and Adyen Web component registration (`registerPaymentMethods.ts`,
`paymentMethods.ts`). Nothing secret is importable from here.

## Talking to Adyen

All server-side calls go through `packages/platform/adyen.ts`, over the official Adyen Node library
(v32) rather than bare `fetch`. The library supplies `X-API-Key`, idempotency keys, user-agent and
`adyen-library-*` headers, follows 308 redirects and parses Adyen's error shapes, all things that
would otherwise be reimplemented by hand and drift.

Two things are worth knowing before touching this file:

- **TEST is enforced here, not by convention.** A LIVE endpoint or a client key that does not start
  with `test_` is rejected before a request is built.
- **It carries two Deno workarounds.** The library's transport is written for Node. Before Deno
  2.8.0, `flushHeaders()` would freeze a request without ever sending it _or_ raising, and
  `res.complete` was never set, so even valid responses failed. Both are neutralised here. The
  pinned runtime no longer needs them; they are harmless on a compliant one and let the repo still
  run on an older local Deno. That silent hang, not CORS, not TLS, is why an earlier attempt
  abandoned the library for `fetch`.

**Each API family accepts a different set of fields.** `/sessions`, `/payments` and `/paymentLinks`
reject unknown properties outright, and they do not agree on what is known: `channel` is required by
the first two and rejected by the third. `apps/adyen-digital/api.ts` builds request bodies per
context for exactly this reason.

## Data model

Ten tables, defined in `packages/platform/migrations/`: `profiles`, `orders`, `payment_sessions`,
`attempts`, `payment_parts`, `api_calls`, `frontend_callbacks`, `webhooks`, `lifecycle_actions`,
`audit_log`.

An order reference or a correlation UUID ties an observability row back to the Back Office. Unique
constraints on `dedupe_key` and `idempotency_key` make repeated writes harmless, which is what makes
webhook redelivery and a double-clicked action safe by construction rather than by retry logic.

**A refusal ends an attempt, not an order.** An order stays open while its link or order is valid
and another attempt could still happen. Authorised amounts are deduplicated by PSP reference,
partial payments wait for `ORDER_CLOSED`, and expiry follows the link's effective validity.

The styling playground uses none of this. It creates a session, mounts a Drop-in, and stores nothing
but your panel settings in `localStorage`.

## Building and running

| Task                    | Effect                                                                            |
| ----------------------- | --------------------------------------------------------------------------------- |
| `deno task dev:all`     | All four in watch mode, ports 8001–8004.                                          |
| `deno task dev:styling` | One app (`dev:digital`, `dev:ipp`, `dev:agentic` likewise).                       |
| `deno task check`       | Format, lint, types, tests, build, SSR assertion. What CI runs.                   |
| `deno task ssr:assert`  | Boots each built server and checks the page still renders and still names itself. |
| `deno task test`        | Tests only, in parallel.                                                          |
| `deno task verify`      | Build, then assert the SSR bundles are real.                                      |

Ports are fixed per app so the four can run together: digital 8001, IPP 8002, agentic 8003,
styling 8004.

**Some tests reach the network.** The token audit in
`apps/adyen-v6-styling/components/adyenOptions.test.ts` fetches the real `adyen.css` for the pinned
SDK version and fails if the panel offers a custom property Adyen no longer reads, or misses one it
added. That is the point, an SDK bump should not pass quietly. Run it offline and it fails on the
fetch, not on a real regression.

## Deployment

`render.yaml` is one blueprint covering all four services. Digital and Styling run on `starter` with
a persistent disk for SQLite; IPP and Agentic run on `free` with no disk, so they cold-start and
keep nothing between deploys.

**`PUBLIC_ORIGIN` must match the host the browser actually used.** It anchors the CSRF origin check,
and a mismatch surfaces as a 403 on every mutation rather than as a configuration error.

## Adding a fifth playground

1. Create `apps/<name>/` with the six pieces above; copy the smallest existing app as the skeleton.
2. Add it to `workspace` in the root `deno.json`, plus `dev:` and `build:` tasks.
3. Mount `basePlatformApi` from `packages/platform/base-api.ts` so it inherits bootstrap, profile
   and health for free.
4. Add a service block to `render.yaml`, with a disk only if it needs to persist anything.
5. Add it to `apps/landing/index.html` and to the applications table in the root `README.md`, a
   playground nobody can reach from the front door may as well not be deployed.
6. Add its SSR assertion to the `ssr:assert` task and to its Dockerfile.

**Renaming an app moves its SSR marker.** Each Dockerfile asserts the built page still contains that
app's own name, which is what stops a broken build reaching a deploy. The same assertions run in
`deno task ssr:assert`, so a rename fails locally instead of inside Docker.

Put anything a second app could plausibly want in `packages/platform`, not in the app. That rule is
why markets, HMAC and the state machine each exist exactly once.
