# IPP Endless Aisle

Panier commerçant, association terminal, paiement Cloud Device, historique et Back Office TEST. Le
mode mock est la valeur par défaut et reste explicitement marqué comme simulation locale.

## Local

```bash
cp .env.example .env
deno task dev
deno task build
deno task test
deno task start
```

Routes de santé : `/healthz` et `/api/health`. Le webhook configurable est
`${PUBLIC_ORIGIN}/webhook`.

## Docker et Render

```bash
docker build -f apps/adyen-ipp-endless-aisle/Dockerfile -t adyen-ipp:test .
docker run --rm --env-file apps/adyen-ipp-endless-aisle/.env -p 8000:8000 adyen-ipp:test
```

Le profil Real TEST requiert API credential Cloud Device, merchant account et terminal ID. L’origine
Render proposée est `https://ipp-endless-aisle.onrender.com`.
