# Adyen V6 Styling

Application minimale : Drop-in s’affiche directement avec un panneau de styling coulissant. Deux
exports sont disponibles : configuration secured-fields et CSS ciblé.

## Local

```bash
cp .env.example .env
deno task dev
deno task build
deno task test
deno task start
```

Les styles officiels s’appliquent aux champs sécurisés ; les overrides CSS ne traversent pas les
iframes et doivent être revus à chaque changement de version.

## Docker

```bash
docker build -f apps/adyen-v6-styling/Dockerfile -t adyen-styling:test .
docker run --rm --env-file apps/adyen-v6-styling/.env -p 8000:8000 adyen-styling:test
```
