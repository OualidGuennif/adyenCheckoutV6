# Adyen TEST Playground Suite

Monorepo de quatre applications Fresh + Hono autonomes, exclusivement destinées à Adyen TEST. Le
code existant du workspace n’a pas été supprimé : cette suite reprend ses parcours utiles, réutilise
les identifiants TEST locaux uniquement côté serveur et remplace progressivement la structure
Express historique.

> **TEST ENVIRONMENT ONLY** — Do not enter or upload production credentials. All variables,
> endpoints and payment flows in this playground are intended exclusively for Adyen TEST and will
> not work in production.

## Applications

| Application               | Rôle                                                          | Port conseillé |
| ------------------------- | ------------------------------------------------------------- | -------------: |
| `adyen-digital`           | Sessions, Advanced, Pay by Link, MIT, API Only et Back Office |           8001 |
| `adyen-ipp-endless-aisle` | Panier Endless Aisle et Terminal API Cloud Device             |           8002 |
| `adyen-agentic-commerce`  | Parcours agentique explicite mock/réel-indisponible           |           8003 |
| `adyen-v6-styling`        | Drop-in direct, styling officiel et overrides CSS             |           8004 |

## Versions vérifiées

| Dépendance/API       | Version retenue | Décision                                              |
| -------------------- | --------------- | ----------------------------------------------------- |
| Deno                 | 2.5.6           | Runtime commun                                        |
| Fresh                | 2.3.3           | Frontend SSR/islands                                  |
| Hono                 | 4.12.31         | API embarquée dans chaque serveur Fresh               |
| Adyen Web            | 6.41.0          | Version stable vérifiée au moment de l’implémentation |
| Checkout API         | v72             | Appels TEST explicites via le transport natif Deno    |
| `@adyen/api-library` | 32.0.0          | Contrats et référence SDK conservés                   |
| Vite                 | 7.1.4           | Version compatible Fresh/Deno pour build et HMR       |

La v6.41.0 inclut les évolutions demandées par rapport au PDF v6.40.2 : `healthcare` dans
`onBinLookup`, validation de `threeDSNotificationURL`, types plus stricts, `installmentOptions` dans
`/sessions` et correction ARIA pour `openFirstPaymentMethod=false`.

## Démarrage local

Prérequis : Deno 2.5.6 ou compatible.

```bash
cd /Users/wallseven/Desktop/chatgpt/adyen-playground-suite
deno task dev:all
```

Cette commande ouvre les quatre serveurs Vite sur les ports `8001` à `8004`. Les modifications
frontend et backend sont rechargées automatiquement : il n’est pas nécessaire de redémarrer. Arrêtez
les quatre processus avec un seul `Ctrl+C`. Pour ne lancer qu’une application :

```bash
deno task dev:digital
deno task dev:ipp
deno task dev:agentic
deno task dev:styling
```

Chaque application possède aussi ses tâches locales :

```bash
deno task --cwd apps/adyen-digital dev
deno task --cwd apps/adyen-digital build
deno task --cwd apps/adyen-digital test
deno task --cwd apps/adyen-digital start
```

`dev` utilise Vite avec hot reload. `start` sert le dernier build de production et nécessite donc un
`build` préalable.

Le profil `Default TEST profile` lit les variables d’environnement côté serveur. Pour générer les
quatre `.env` locaux à partir du playground historique sans afficher les secrets :

```bash
deno task env:migrate
```

Le frontend ne reçoit que le statut du profil et la client key TEST publiable nécessaire à Adyen
Web. Les autres profils sont chiffrés côté serveur ; le profil préféré est mémorisé dans un cookie
HttpOnly signé.

Copiez le fichier `.env.example` de l’application concernée vers `.env`, puis fournissez vos valeurs
TEST. Aucun fichier `.env` n’est versionné.

## Commandes racine

```bash
deno task fmt:check  # format
deno task lint       # lint
deno task types      # TypeScript
deno task test       # tests unitaires et intégration
deno task build      # quatre builds de production
deno task check      # pipeline complet
deno task verify     # démarre les quatre builds et vérifie /healthz
```

## Docker

Le contexte de build est la racine du monorepo :

```bash
docker build -f apps/adyen-digital/Dockerfile -t adyen-digital:test .
docker run --rm --env-file apps/adyen-digital/.env -p 8000:8000 adyen-digital:test
```

Remplacez le chemin d’application pour les trois autres images. Chaque image possède un
`HEALTHCHECK` sur `/healthz`.

## Render

`render.yaml` à la racine décrit les quatre services et un disque SQLite persistant par application.
Chaque application possède aussi son propre `render.yaml` pour un déploiement isolé.

1. Créez un Blueprint depuis le dépôt.
2. Ajoutez uniquement des credentials Adyen TEST dans le dashboard Render.
3. Laissez Render générer `PROFILE_ENCRYPTION_KEY` et `SESSION_SIGNING_SECRET`.
4. Ajoutez l’origine HTTPS exacte aux allowed origins de la client key TEST.
5. Configurez les webhooks avec l’URL exposée, la clé HMAC TEST et, si souhaité, Basic Auth.

Pour IPP, l’origine prévue est `https://ipp-endless-aisle.onrender.com` et le webhook
`https://ipp-endless-aisle.onrender.com/webhook`. Modifiez `PUBLIC_ORIGIN` si le nom du service
change.

## Persistance

SQLite en WAL conserve profils, commandes, sessions, tentatives, parties, appels API, callbacks,
webhooks, actions lifecycle et audit. Le schéma source est
`packages/platform/migrations/001_initial.sql`. Sur Render, un disque persistant est obligatoire.
SQLite convient à ce playground à instance unique ; pour plusieurs réplicas, migrez le même modèle
vers PostgreSQL et utilisez une file de traitement des webhooks.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Sécurité et modèle de menace](./docs/SECURITY.md)
- [Limites connues et fonctions simulées](./docs/KNOWN_LIMITS.md)
- Wikis intégrés : `/wiki` dans Digital, IPP et Agentic
- Référence secondaire fournie : PDF callbacks Adyen Web v6.40.2, relu mais non copié aveuglément

Sources officielles principales : [Fresh](https://jsr.io/@fresh/core/doc),
[Hono](https://jsr.io/@hono/hono/versions),
[Adyen Web](https://www.npmjs.com/package/%40adyen/adyen-web),
[Node API library](https://www.npmjs.com/package/%40adyen/api-library?activeTab=versions),
[Checkout API v72](https://docs.adyen.com/api-explorer/Checkout/72/post/sessions),
[HMAC](https://docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures)
et [idempotence](https://docs.adyen.com/development-resources/api-idempotency).
