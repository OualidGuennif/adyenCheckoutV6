# Adyen Agentic Commerce

Playground pédagogique distinguant les étapes exécutées localement, simulées et indisponibles. Le
mode réel ne fabrique jamais de contrat ni de réponse fournisseur.

## Local

```bash
cp .env.example .env
deno task dev
deno task build
deno task test
deno task start
```

Le mode mock ne contacte aucun fournisseur. Une session Adyen Checkout TEST standard peut être créée
après confirmation humaine si le profil est configuré ; elle n’est pas présentée comme un appel
Agentic Commerce.

## Docker

```bash
docker build -f apps/adyen-agentic-commerce/Dockerfile -t adyen-agentic:test .
docker run --rm --env-file apps/adyen-agentic-commerce/.env -p 8000:8000 adyen-agentic:test
```
