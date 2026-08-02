# Adyen Agentic Commerce

A teaching playground for agent-initiated purchases. Every step is labelled with what it actually
is: executed locally, simulated, or unavailable.

**Nothing here is presented as a response from OpenAI, Copilot, Google or Adyen.** The mock is a
deterministic local simulation, and real mode does not invent a contract when one does not exist.

## Quick start

```bash
cp .env.example .env      # mock mode needs nothing filled in
deno task dev             # http://localhost:8000
```

From the repository root, `deno task dev:agentic` runs it on port 8003.

| Task              | What it does                        |
| ----------------- | ----------------------------------- |
| `deno task dev`   | Development server with hot reload. |
| `deno task build` | Production build.                   |
| `deno task start` | Serve a build.                      |
| `deno task test`  | Tests.                              |
| `deno task check` | Format, lint and type-check.        |

Health routes: `/healthz` and `/api/health`.

## The two modes

**Mock** (default) contacts no provider. Every step is marked as a simulation.

**Real** answers `501` and reaches no endpoint. That is deliberate: Adyen's public material
describes agentic integrations as a pilot, and no publicly verifiable TEST contract was available to
build against. Shipping a plausible-looking fake would be worse than an honest 501.

**Human-confirmed payment** is the part that does work end to end. Once you confirm as a human, it
creates a standard Adyen Checkout **TEST session** — with a configured profile. It is a normal
session, and the UI says so rather than dressing it up as an Agentic Commerce API call.

## Environment variables

Copy `.env.example` to `.env`. **Mock mode runs with an empty file.**

### For the human-confirmed payment step

| Variable                 | Where to get it                                                                   |
| ------------------------ | --------------------------------------------------------------------------------- |
| `ADYEN_API_KEY`          | Customer Area → Developers → API credentials, **TEST**.                           |
| `ADYEN_MERCHANT_ACCOUNT` | Your TEST merchant account name.                                                  |
| `ADYEN_CLIENT_KEY`       | Same credential page, must start with `test_`, with `PUBLIC_ORIGIN` allow-listed. |

### Real mode

| Variable                     | Default | Notes                                                                                                                    |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `AGENTIC_REAL_ENABLED`       | `false` | Leave it off. Real mode also requires a bearer token, and both together still only unlock a path that returns 501 today. |
| `ADYEN_AGENTIC_BEARER_TOKEN` | none    | Only meaningful once an official pilot TEST contract exists.                                                             |

### Set these only when you deploy

| Variable                 | Default if unset                                        | When it matters                                                                                                    |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_ORIGIN`          | `http://localhost:<PORT>`                               | The exact origin browsers use. Anchors the CSRF check.                                                             |
| `ADYEN_HMAC_KEY`         | none                                                    | Validates incoming webhooks; without it they are rejected as unsigned.                                             |
| `PROFILE_ENCRYPTION_KEY` | A key file next to the database, generated on first run | Encrypts profiles added through the UI. **Required** on Render or Deno Deploy. 32-byte Base64 or 64-character hex. |
| `SESSION_SIGNING_SECRET` | A new random value on every boot                        | Signs the session and CSRF cookies.                                                                                |

### Rarely worth touching

| Variable                                      | Default                 | Notes                                        |
| --------------------------------------------- | ----------------------- | -------------------------------------------- |
| `PORT`                                        | `8000`                  | Render sets this for you.                    |
| `DATABASE_PATH`                               | `./data/agentic.sqlite` | History and profiles.                        |
| `PLAYGROUND_BASIC_AUTH_USER` / `..._PASSWORD` | off                     | Puts the whole playground behind Basic Auth. |

## Docker and Render

```bash
docker build -f apps/adyen-agentic-commerce/Dockerfile -t adyen-agentic:test .
docker run --rm --env-file apps/adyen-agentic-commerce/.env -p 8000:8000 adyen-agentic:test
```

In the root `render.yaml` this service runs on the free plan with no disk, so it cold-starts and
keeps nothing between deploys.

## Disclaimer

A playground for exploring and testing Adyen against its **TEST** environment. Not a product, not a
reference integration, and not intended to be deployed to production as-is. Not built or supported
by Adyen.

If you reuse any of this, you alone remain responsible for your own payment stack — PCI scope,
regulatory compliance, security review and the correctness of your flows. Provided as is, with no
warranty and no liability, under the MIT Licence.

Full text: [Disclaimer](../../README.md#disclaimer) · [Security](../../docs/SECURITY.md) ·
[Known limits](../../docs/KNOWN_LIMITS.md)
