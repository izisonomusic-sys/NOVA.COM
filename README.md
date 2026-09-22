# nova.com — Founder Investment Platform V5

Plateforme d’investissement contrôlée par le fondateur : les utilisateurs s’inscrivent, déposent, investissent dans les projets publiés par le fondateur, reçoivent les gains selon les règles de la plateforme, retirent leurs fonds et parrainent. Aucun utilisateur ne peut publier de projet.

## Supabase live
Project: `winner`
Project ref: `hagjibqjpytkwpktdbnx`
URL: `https://hagjibqjpytkwpktdbnx.supabase.co`

V4 est alignée sur le schéma Supabase réel (`public.profiles`, `projects`, `wallets`, `transactions`, `deposits`, `investments`, `withdrawals`, `referrals`, `notifications`, `audit_logs`, `platform_settings`). Authentification : Supabase Auth.

Voir `docs/INTEGRATION-V4.md` et `docs/LIVE-SUPABASE-WINNER.md`.
# nova.com V5 — plateforme d'investissement du fondateur

V3 est une plateforme **fondateur-only** inspirée des parcours simples des plateformes d'investissement :

- Le fondateur est le seul `SUPER_ADMIN`.
- Les utilisateurs ne créent ni ne publient de projets.
- Les utilisateurs peuvent créer un compte, déposer, investir, suivre leurs investissements, recevoir les rendements configurés, retirer leur solde et parrainer.
- Aucun écran KYC n'est inclus.
- PayDunya est isolé derrière un provider : le mode `mock` permet de développer sans clés de paiement ; le mode `api` utilise uniquement les endpoints/credentials fournis par le contrat marchand PayDunya.
- Supabase est la base PostgreSQL cible et peut aussi fournir Storage/Edge Functions.

## Architecture

`Next.js 15 -> NestJS API -> Prisma -> Supabase Postgres`

Services complémentaires :

- Supabase Storage pour les images des projets.
- Supabase Edge Function prête pour le webhook PayDunya.
- Redis optionnel pour le cache/queues futurs.
- Job NestJS horaire pour créditer automatiquement capital + rendement à maturité.

Supabase fournit un PostgreSQL complet et documente l'usage de Supavisor/pooler, Storage et Edge Functions. Voir la documentation officielle : https://supabase.com/docs/guides/database/overview et https://supabase.com/docs/guides/functions.

## Fonctionnalités V3

### Investisseur
- inscription / connexion
- lien de parrainage à l'inscription
- tableau de bord
- portefeuille XOF
- dépôt PayDunya
- investissement dans les projets publiés
- calcul du rendement attendu
- règlement automatique à maturité
- historique financier
- demande de retrait
- notifications
- profil / changement de mot de passe
- parrainage

### Fondateur
- dashboard KPI
- liste utilisateurs
- activation/désactivation utilisateurs
- création / modification / publication / pause / suppression des projets
- mises à jour de projet
- suivi dépôts
- validation/refus des retraits
- ajustement manuel du portefeuille avec transaction d'audit financier
- stockage des images de projet via Supabase Storage

### Finance
Toutes les variations de portefeuille importantes créent une transaction. Le solde ne doit pas être considéré comme un simple chiffre isolé : l'historique `Transaction` constitue le ledger applicatif.

## Supabase

1. Créer un projet Supabase.
2. Récupérer la chaîne `DATABASE_URL` pooler et `DIRECT_URL`.
3. Copier `.env.example` vers `.env`.
4. Renseigner `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` et surtout `SUPABASE_SECRET_KEY` uniquement côté serveur.
5. Exécuter `npm install`.
6. `npm run db:generate`.
7. `npm run db:migrate` pour appliquer `apps/api/prisma/migrations/0001_init`.
8. `npm run db:seed` pour créer le fondateur et le projet de démonstration.

Alternative : copier le contenu de `supabase-schema.sql` dans Supabase SQL Editor.

## Storage

Créer un bucket Supabase Storage nommé `projects`. Le backend possède un endpoint `POST /storage/signed-upload` réservé au fondateur pour préparer un upload signé.

## PayDunya

La V9 utilise désormais PayDunya pour les dépôts et les retraits.

- `PAYDUNYA_MODE=mock` pour le développement local
- `PAYDUNYA_MODE=sandbox` pour les tests PayDunya
- `PAYDUNYA_MODE=live` pour la production
- `PAYDUNYA_MASTER_KEY`
- `PAYDUNYA_PRIVATE_KEY`
- `PAYDUNYA_TOKEN`
- `PAYDUNYA_CALLBACK_URL`
- `PAYDUNYA_RETURN_URL`
- `PAYDUNYA_CANCEL_URL`
- `PAYDUNYA_WITHDRAW_MODE`
- `PAYDUNYA_DEBIT_ACCOUNT_NUMBER` (optionnel)

Le dépôt utilise le checkout PayDunya avec redirection. Le retrait utilise l'API PUSH PayDunya. Le webhook est vérifié avec le hash SHA-512 de la Master Key avant traitement idempotent.

Ne mets jamais les secrets PayDunya ou Supabase service/secret key dans Next.js ou dans le dépôt Git.

## Lancement local

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Web : `http://localhost:3000`
API : `http://localhost:4000`

## Production

- utiliser un JWT secret long et aléatoire
- HTTPS obligatoire
- mettre les secrets dans le gestionnaire de secrets de l'hébergeur
- limiter CORS au domaine réel
- utiliser les URLs PayDunya officielles de ton compte
- configurer le webhook avec vérification cryptographique selon la documentation PayDunya
- sauvegardes Supabase activées
- monitoring / logs / alertes
- tester les scénarios dépôt, webhook, investissement, double webhook, retrait accepté et retrait refusé
- faire valider les règles de rendement et de parrainage par le conseil juridique avant mise en production

## Limite volontaire

Ce dépôt est une implémentation originale du produit demandé. Il ne contient pas de code privé de NUTRA et ne prétend pas connaître son architecture interne.


Voir `docs/V5-RELEASE.md` pour la procédure de mise en service et de test de bout en bout.

## Authentification

- Inscription avec prénom, nom, numéro de téléphone et mot de passe.
- Aucun OTP, SMS transactionnel ou fournisseur SMS n’est utilisé par l’application.
- Le serveur crée l’identité Supabase avec un identifiant interne non exposé à l’utilisateur, puis ouvre immédiatement sa session.
- Connexion avec le numéro de téléphone et le mot de passe.

### Configuration Supabase requise

Le fournisseur Phone/SMS n’est pas utilisé par l’application. Le serveur utilise `SUPABASE_SECRET_KEY` uniquement pour créer/confirmer les identités internes, et le fournisseur Email de Supabase pour l’authentification technique avec un alias interne. Aucun email n’est envoyé à l’utilisateur.
