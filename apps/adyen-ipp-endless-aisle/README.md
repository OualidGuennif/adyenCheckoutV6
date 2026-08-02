# Endless Aisle

In-person payments: a shop-floor basket, terminal pairing, a Cloud Device payment, history and a
Back Office, the "endless aisle" case where a colleague finishes a sale on a terminal.

**Mock mode is the default** and is labelled as a local simulation everywhere it appears. It
contacts nothing. Real TEST mode needs a physical terminal that is online.

## Quick start

```bash
cp .env.example .env      # mock mode needs nothing filled in
deno task dev             # http://localhost:8000
```

From the repository root, `deno task dev:ipp` runs it on port 8002.

| Task              | What it does                        |
| ----------------- | ----------------------------------- |
| `deno task dev`   | Development server with hot reload. |
| `deno task build` | Production build.                   |
| `deno task start` | Serve a build.                      |
| `deno task test`  | Tests.                              |
| `deno task check` | Format, lint and type-check.        |

Health routes: `/healthz` and `/api/health`.

## Environment variables

Copy `.env.example` to `.env`. **Mock mode runs with an empty file**: everything below is for Real
TEST mode.

### Required for Real TEST mode

| Variable                 | Where to get it                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `ADYEN_API_KEY`          | A **Cloud Device API** credential, TEST. This is not the same credential as an e-commerce API key, Terminal API needs its own. |
| `ADYEN_MERCHANT_ACCOUNT` | The POS merchant account the terminal is assigned to, often `...POS`.                                                          |
| `ADYEN_TERMINAL_ID`      | The POIID, e.g. `V400m-123456789`. Visible in Customer Area → In-person payments → Terminals.                                  |

There is no `ADYEN_CLIENT_KEY` here: no card fields render in the browser. The terminal collects the
card.

### Set these only when you deploy

| Variable                 | Default if unset                                        | When it matters                                                                                                                |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_ORIGIN`          | `http://localhost:<PORT>`                               | The exact origin browsers use. Anchors the CSRF check, and where your Terminal API webhook points: `${PUBLIC_ORIGIN}/webhook`. |
| `ADYEN_HMAC_KEY`         | none                                                    | Validates incoming webhooks. Without it they are rejected as unsigned.                                                         |
| `PROFILE_ENCRYPTION_KEY` | A key file next to the database, generated on first run | Encrypts profiles added through the UI. **Required** on Render or Deno Deploy. 32-byte Base64 or 64-character hex.             |
| `SESSION_SIGNING_SECRET` | A new random value on every boot                        | Signs the session and CSRF cookies.                                                                                            |

### Optional

| Variable                                      | Default             | Notes                                                                                                        |
| --------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `WEBHOOK_BASIC_AUTH_USER` / `..._PASSWORD`    | off                 | Basic Auth **expected on `/webhook`**, if you configured it on the Adyen side. Different from the two below. |
| `PLAYGROUND_BASIC_AUTH_USER` / `..._PASSWORD` | off                 | Puts the whole playground behind Basic Auth.                                                                 |
| `PORT`                                        | `8000`              | Render sets this for you.                                                                                    |
| `DATABASE_PATH`                               | `./data/ipp.sqlite` | Basket, history, webhooks.                                                                                   |

## What Real TEST mode actually needs

More than credentials, and this is where it usually fails:

- a Cloud Device API credential that is **authorised for your terminal**
- a TEST terminal that is **powered on and online**: Cloud mode reaches it through Adyen, so a
  terminal that is asleep or off the network simply does not answer
- the merchant account the terminal is actually assigned to
- the correct POIID, matching the terminal exactly

A hosted deployment cannot wake a terminal for you. Asynchronous follow-up depends on your Terminal
API webhook configuration.

## Docker and Render

```bash
docker build -f apps/adyen-ipp-endless-aisle/Dockerfile -t adyen-ipp:test .
docker run --rm --env-file apps/adyen-ipp-endless-aisle/.env -p 8000:8000 adyen-ipp:test
```

In the root `render.yaml` this service runs on the free plan with no disk, so it cold-starts and
keeps nothing between deploys. Give it a disk if you want history to survive.

## Disclaimer

A playground for exploring and testing Adyen against its **TEST** environment. Not a product, not a
reference integration, and not intended to be deployed to production as-is. Not built or supported
by Adyen.

If you reuse any of this, you alone remain responsible for your own payment stack, PCI scope,
regulatory compliance, security review and the correctness of your flows. Provided as is, with no
warranty and no liability, under the MIT Licence.

Full text: [Disclaimer](../../README.md#disclaimer) · [Security](../../docs/SECURITY.md) ·
[Known limits](../../docs/KNOWN_LIMITS.md)
