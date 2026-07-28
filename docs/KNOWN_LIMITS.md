# Limites connues et simulations

## Intégrations non confirmées

Aucun paiement réel n’est déclaré comme validé sans credentials, méthodes, origins et webhooks Adyen
TEST actifs. Les builds, contrats locaux, validations de sécurité et mocks sont vérifiables sans
effectuer de transaction.

## Agentic Commerce

Le mode mock est une simulation locale déterministe et chaque étape porte son statut. Aucun contenu
n’est présenté comme une réponse OpenAI, Copilot, Google ou Adyen. Les supports publics Adyen
décrivent les intégrations agentiques comme un pilote ; aucun contrat API TEST public vérifiable n’a
été utilisé. Le mode réel répond donc `501` et ne contacte aucun endpoint. Le paiement
human-confirmed est une session Checkout TEST standard, pas une API Agentic Commerce.

## IPP

Le mode mock n’appelle pas Adyen. Le mode Real TEST requiert une credential Cloud Device autorisée,
un terminal TEST en ligne, le bon merchant account et le POIID correct. Un hébergement Render ne
peut ni connecter ni réveiller un terminal hors ligne. Le suivi asynchrone dépend de la
configuration du webhook Terminal API.

## Paiements

Les capacités varient selon le pays, le contrat marchand, le moyen de paiement et sa configuration.
Les valeurs `iDEAL`, `MB WAY` et le défaut PayPal settlement-only sont documentées, mais le Back
Office ne remplace pas la réponse Adyen ou le Customer Area. Les remboursements/captures réels
restent à confirmer avec un profil TEST autorisé.

## Persistance et exploitation

SQLite est adapté au développement et à un service Render mono-instance avec disque persistant. La
mise à l’échelle horizontale requiert PostgreSQL, un verrouillage distribué, une file de webhooks et
un rate limit partagé. Les sauvegardes et politiques de rétention ne sont pas automatisées.

## Styling

Le bloc `styles` vise les secured fields rendus en iframe. Les overrides CSS ne peuvent pas modifier
le contenu sécurisé des iframes et les sélecteurs internes peuvent évoluer entre versions. Les
exports doivent être revus après toute montée de version Adyen Web.
