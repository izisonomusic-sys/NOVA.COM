# V14 — Correction "Impossible de joindre le serveur (localhost:4000)"

## Symptôme rapporté
Sur `/register` (et probablement `/login`), le message affiché est :
> Impossible de joindre le serveur (http://localhost:4000). Vérifiez NEXT_PUBLIC_API_URL
> et que l'API est démarrée.

## Ce que ce message veut dire
`apps/web/lib/api.ts` affiche ce message uniquement quand l'appel `fetch()` du
navigateur échoue **au niveau réseau** (pas une erreur HTTP 4xx/5xx — une vraie
absence de réponse). Concrètement : **rien n'écoute sur le port 4000**.

## Cause trouvée
Le zip ne contenait **aucun fichier `.env` réel** — seulement des gabarits
(`apps/api/.env.example`, `apps/web/.env.local.example`, etc.). Or :
- `apps/web` a besoin d'un fichier nommé exactement `.env.local`.
- `apps/api` a besoin d'un fichier nommé exactement `.env`.

Sans `apps/api/.env`, `DATABASE_URL` (entre autres) est `undefined`. Au démarrage,
`PrismaService.onModuleInit()` appelle `this.$connect()`, qui plante immédiatement
avec une erreur Prisma. Comme ce plantage survient **avant** `app.listen(4000)`,
le serveur ne se met jamais à écouter sur le port 4000 → le frontend ne peut
jamais le joindre, d'où le message que tu vois.

Ce problème était invisible car rien n'expliquait clairement, dans le terminal,
pourquoi l'API ne démarrait pas.

## Bug supplémentaire trouvé dans ce zip
`apps/api/prisma/schema.prisma` contenait `schemas = ["public", "auth"]` dans le
bloc `datasource db`, ce qui nécessite le preview feature `multiSchema` (non activé)
et n'était utilisé par aucun modèle. Corrigé (ligne retirée).

## Corrections apportées

1. **`apps/api/.env`** *(nouveau, à partir de `.env.example`)* — à remplir avec tes
   vraies valeurs Supabase/PayDunya (voir liste ci-dessous).
2. **`apps/web/.env.local`** *(nouveau, à partir de `.env.local.example`)* — déjà
   pré-rempli avec `NEXT_PUBLIC_API_URL=http://localhost:4000`, le reste à compléter.
3. **`apps/api/src/main.ts`** — ajout de `checkRequiredEnv()` : au démarrage, l'API
   vérifie que `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
   sont bien renseignés (ni vides, ni valeurs placeholder du type `TON-PROJET` /
   `COLLE_ICI`). Si une variable manque, l'API affiche clairement laquelle dans le
   terminal et s'arrête proprement, au lieu de planter silencieusement dans Prisma.
   Ajout aussi d'un `.catch()` global sur `main()` pour que toute erreur de démarrage
   soit loguée avec son message complet.
4. **`apps/api/prisma/schema.prisma`** — suppression de la ligne `schemas` invalide.

## À faire de ton côté — obligatoire pour que ça démarre

Ouvre `apps/api/.env` et remplace ces valeurs par les tiennes (Supabase → Project
Settings → API) :
```
DATABASE_URL=...
DIRECT_URL=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```
Puis :
```bash
npm install
npm run db:generate
npm run dev
```
Ouvre ensuite `http://localhost:4000/public/health` : si `database` et les
indicateurs Supabase ne sont pas tous à `true`, c'est qu'une valeur est encore
incorrecte — et maintenant le terminal de l'API te dira explicitement laquelle
si elle manque totalement.

## Vérifications effectuées ici
- `npx tsc --noEmit` sur `apps/api` : aucune nouvelle erreur introduite par ces
  changements (les 10 erreurs restantes sont pré-existantes et dues au fait que
  je ne peux pas télécharger le moteur Prisma dans mon environnement sandbox —
  domaine `binaries.prisma.sh` non autorisé ici — donc `@prisma/client` n'est pas
  généré avec ton schéma réel).
- Je n'ai pas pu démarrer réellement l'API ni te confirmer que `/register`
  fonctionne de bout en bout : je n'ai ni ta base Supabase ni tes vraies clés.


## Rendement automatique 17%
- Sans `returnPlans`, `expectedReturnPct` est interprété comme un taux QUOTIDIEN.
- Exemple 3 000 XOF à 17%/jour pendant 15 jours: 510 XOF/jour, 7 650 XOF de gain, puis restitution des 3 000 XOF de capital (10 650 XOF au total).
- Le moteur quotidien crédite les jours dus automatiquement et restitue le capital à l'échéance.
