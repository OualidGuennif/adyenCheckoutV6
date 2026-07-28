# Adyen Digital

Playground marchand TEST couvrant Sessions, Advanced Flow, Pay by Link, MIT, API Only/PCI et un Back
Office corrélé.

## Local

```bash
cp .env.example .env
deno task dev
deno task build
deno task test
deno task start
```

Depuis la racine : `deno task dev:digital`. Routes de santé : `/healthz` et `/api/health`.

Le panneau latéral des pages Drop-in/Component conserve callbacks, appels API et webhooks nettoyés.
Le Back Office expose la chronologie et explique les actions lifecycle désactivées. Le fichier
`../../packages/platform/payment-methods.ts` contient les capacités métier modifiables.

## Docker et Render

```bash
docker build -f apps/adyen-digital/Dockerfile -t adyen-digital:test .
docker run --rm --env-file apps/adyen-digital/.env -p 8000:8000 adyen-digital:test
```

Le fichier `render.yaml` local décrit le service isolé. Configurez une client key TEST autorisant
l’origine déployée et un webhook TEST vers `/webhook`.
