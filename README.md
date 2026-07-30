# Adyen TEST Playground Suite

Four self-contained Fresh + Hono apps for exploring Adyen integrations, sharing one platform and UI
package.

> **TEST ENVIRONMENT ONLY** — never enter production credentials. Every endpoint, variable and
> payment flow here targets Adyen TEST and will not work in production.

## Applications

| App                       | Covers                                                         | Dev port |
| ------------------------- | -------------------------------------------------------------- | -------: |
| `adyen-digital`           | Sessions, Advanced, Pay by Link, MIT, API Only and Back Office |     8001 |
| `adyen-ipp-endless-aisle` | Endless Aisle cart and Terminal API Cloud Device               |     8002 |
| `adyen-agentic-commerce`  | Agentic checkout, with mock and real paths kept distinct       |     8003 |
| `adyen-v6-styling`        | Drop-in styling options and CSS overrides                      |     8004 |

## Getting started

Requires Deno 2.5.6 or later.

```bash
deno task dev:all
```

That starts all four apps on ports 8001–8004 with hot reload; one `Ctrl+C` stops them. To run just
one, use `dev:digital`, `dev:ipp`, `dev:agentic` or `dev:styling`.

Each app reads its credentials from its own `.env`. Copy `apps/<app>/.env.example` to
`apps/<app>/.env` and fill in your TEST values — no `.env` file is committed. The browser only ever
receives the publishable TEST client key; API keys, HMAC keys and bearer tokens stay server-side,
and extra profiles are encrypted at rest.

## Tasks

```bash
deno task check    # fmt, lint, types, tests and all four builds
deno task test     # unit and integration tests
deno task build    # four production builds
deno task verify   # start the builds and check /healthz
```

Per app: `deno task --cwd apps/adyen-digital <dev|build|test|start>`. `start` serves the last
production build, so it needs a `build` first.

## Deployment

Docker images build from the repo root and each has a `HEALTHCHECK` on `/healthz`:

```bash
docker build -f apps/adyen-digital/Dockerfile -t adyen-digital:test .
docker run --rm --env-file apps/adyen-digital/.env -p 8000:8000 adyen-digital:test
```

On Render, the root `render.yaml` describes all four services; each app also has its own for an
isolated deploy. Create a Blueprint from the repo, add TEST credentials in the dashboard, let Render
generate `PROFILE_ENCRYPTION_KEY` and `SESSION_SIGNING_SECRET`, then add the deployed HTTPS origin
to the client key's allowed origins and point your TEST webhook at `/webhook`. Set `PUBLIC_ORIGIN`
if a service name differs from the default.

## Storage

SQLite in WAL mode holds profiles, orders, sessions, attempts, API calls, callbacks, webhooks,
lifecycle actions and the audit log. The schema is `packages/platform/migrations/001_initial.sql`.
Render needs a persistent disk for it. This suits a single instance; several replicas would want the
same model on PostgreSQL plus a webhook queue.

## Versions

| Dependency           | Version | Notes                                             |
| -------------------- | ------- | ------------------------------------------------- |
| Deno                 | 2.5.6   | Shared runtime                                    |
| Fresh                | 2.3.3   | SSR and islands                                   |
| Hono                 | 4.12.31 | API router inside each Fresh server               |
| Vite                 | 7.1.4   | Build and HMR                                     |
| Adyen Web            | 6.41.0  | Client-side components                            |
| `@adyen/api-library` | 32.0.0  | Server-side calls, over its own node:https client |
| Checkout API         | v72     | Explicit TEST endpoints                           |

Server-side Adyen calls go through the library's `HttpURLConnectionClient`. Two details it relies on
are missing from Deno 2.5.6's node:http layer and were fixed in Deno 2.8.0, so
`packages/platform/adyen.ts` works around both; the comments there explain what and why.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Security and threat model](./docs/SECURITY.md)
- [Known limits and simulated features](./docs/KNOWN_LIMITS.md)
- Built-in wikis at `/wiki` in Digital, IPP and Agentic

Reference material: [Fresh](https://jsr.io/@fresh/core/doc),
[Hono](https://jsr.io/@hono/hono/versions),
[Adyen Web](https://www.npmjs.com/package/%40adyen/adyen-web),
[Node API library](https://www.npmjs.com/package/%40adyen/api-library?activeTab=versions),
[Checkout API v72](https://docs.adyen.com/api-explorer/Checkout/72/post/sessions),
[HMAC](https://docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures)
and [idempotency](https://docs.adyen.com/development-resources/api-idempotency).
