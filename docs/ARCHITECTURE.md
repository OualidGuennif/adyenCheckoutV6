# Architecture et migration

## Cartographie initiale

Le workspace contenait principalement :

- `checkoutPlayground copie`, une application Express/Node déjà riche en parcours Digital,
  callbacks, webhooks, pays/adresses et configuration TEST ;
- `adyen-fresh-hono-ecommerce-env-cart-webhooks`, un prototype Fresh 1 ;
- plusieurs variantes et documents de cadrage ;
- le PDF `Adyen-Web_V6_Callback_Reference.pdf`, référence callbacks v6.40.2.

Les projets historiques restent intacts. Les règles et parcours utiles ont été portés dans un
nouveau monorepo plutôt que modifiés en place, ce qui facilite la comparaison et le retour arrière.

## Stratégie de migration

1. Centraliser les invariants partagés : TEST-only, sanitation, HMAC, cookies, profils et modèle de
   données.
2. Isoler chaque produit dans un serveur Fresh/Hono autonome.
3. Porter les parcours Digital, puis les enrichir avec observabilité et agrégats métier.
4. Ajouter IPP et Agentic derrière des adaptateurs qui distinguent explicitement réel et mock.
5. Garder Styling volontairement minimal et directement centré sur Drop-in.
6. Valider progressivement types, tests, build et démarrage.

## Décisions structurantes

Chaque `main.ts` crée une application Fresh 2, lui attache un routeur Hono et sert les routes
frontend et API dans le même processus. Cela évite une séparation fragile entre runtimes tout en
conservant Fresh pour l’UI et Hono pour les API.

`packages/platform` contient le code serveur partagé. `packages/ui` contient les tokens, composants
et comportements non sensibles. Aucune API key, clé HMAC, Basic Auth ou bearer agentique n’est
importée dans le bundle client.

Les appels serveur passent par le transport de la bibliothèque officielle Adyen v32,
`HttpURLConnectionClient`, avec les endpoints TEST exacts de Checkout API v72 et Cloud Device API
v1. La bibliothèque fournit ainsi ses propres en-têtes (`X-API-Key`, `Idempotency-Key`, User-Agent
et `adyen-library-*`), sa gestion des redirections 308 et son analyse des erreurs ; `adyen.ts` se
contente de traduire ses exceptions en `AdyenRequestError` et de garantir la contrainte TEST-only.

Ce transport est écrit pour Node et deux détails lui manquaient sous Deno avant la 2.8.0 :
`flushHeaders()` figeait la requête sans jamais la poser sur le réseau ni lever d’erreur, et
`res.complete` n’était jamais mis à `true`, ce qui faisait échouer même les réponses valides.
`packages/platform/adyen.ts` neutralise les deux. Le runtime épinglé (2.9.4) n’en a plus besoin,
mais les contournements restent sans effet sur un runtime conforme et permettent de travailler avec
un Deno local plus ancien. C’est ce blocage silencieux — et non une question de CORS ou de TLS — qui
avait fait abandonner la bibliothèque au profit de `fetch`.

## Modèle de données

Les tables distinguent :

- `profiles` ;
- `orders` ;
- `payment_sessions` ;
- `attempts` ;
- `payment_parts` ;
- `api_calls` ;
- `frontend_callbacks` ;
- `webhooks` ;
- `lifecycle_actions` ;
- `audit_log`.

Une référence de commande ou un UUID de corrélation relie l’observabilité au Back Office. Les
contraintes uniques sur `dedupe_key` et `idempotency_key` rendent les écritures répétées
inoffensives.

## Machine d’état

Un refus termine une tentative, pas la commande. Une commande reste ouverte tant que son lien ou
ordre est valide et qu’une nouvelle tentative peut exister. Les montants autorisés sont dédupliqués
par PSP reference. Les paiements partiels attendent `ORDER_CLOSED`; les expirations utilisent la
validité effective du lien.

Les capacités lifecycle sont configurées dans `packages/platform/payment-methods.ts` et appliquées
par `packages/platform/lifecycle.ts`. Les actions impossibles restent visibles et expliquées.
