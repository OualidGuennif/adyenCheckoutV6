# Sécurité et modèle de menace

## Périmètre

Le playground protège contre l’exposition accidentelle de credentials TEST, le rejeu de mutations,
les webhooks falsifiés, la journalisation de données sensibles, la sélection d’un endpoint LIVE et
la collecte de carte brute. Ce n’est pas une plateforme certifiée PCI ni un coffre de secrets de
production.

## Contrôles implémentés

- endpoints et client keys LIVE rejetés ;
- badge et avertissement TEST permanents ;
- API key, HMAC, Basic Auth et bearer confinés au serveur ;
- client key transmise seulement lorsqu’elle commence par `test_` ;
- profils personnalisés chiffrés AES-256-GCM dans SQLite ;
- clé de chiffrement obligatoire sur un hébergement Render ;
- cookie de préférence HttpOnly, signé, `SameSite=Lax` et `Secure` en HTTPS ;
- session/CSRF double-submit signée pour les mutations `/api/*` ;
- Basic Auth optionnelle pour le playground ;
- limiteur de requêtes en mémoire ;
- validation HMAC standard et header ;
- déduplication des webhooks et idempotence des actions ;
- redaction récursive des clés sensibles et troncature des payloads ;
- rejet explicite des PAN/CVC bruts ;
- CSP et en-têtes de sécurité sur les API.

## Secrets et profils

Le profil par défaut provient uniquement des variables d’environnement. Son menu indique
`configured` ou les champs manquants sans révéler les valeurs. Les profils ajoutés depuis l’UI sont
envoyés directement au backend, chiffrés et jamais renvoyés en clair. Leur suppression est
irréversible ; le profil d’environnement ne peut pas être supprimé depuis l’application.

Le chiffrement applicatif ne remplace pas un secret manager. Les clés et la base persistante doivent
avoir des accès Render limités. Une rotation de `PROFILE_ENCRYPTION_KEY` nécessite une migration ou
la recréation des profils chiffrés.

## Données carte et PCI

Seuls Adyen Web Drop-in/Components, les secured fields et les identifiants de moyens de paiement
stockés sont autorisés. Le backend ne doit recevoir ni conserver PAN, date d’expiration ou CVC en
clair. Le mode API Only démontre le contrat avec des champs chiffrés Adyen ; il ne réduit pas à lui
seul les obligations PCI du marchand.

## Limites de menace

Le rate limit est local au processus. SQLite et les profils chiffrés ne conviennent pas à plusieurs
réplicas sans coordination. Les logs de plateforme, sauvegardes, droits opérateur et protection DDoS
restent à configurer chez l’hébergeur. N’utilisez jamais de credentials LIVE, même si un contrôle
applicatif pouvait être contourné.
