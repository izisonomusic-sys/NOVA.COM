# V13 — Corrections du 500 sur POST /auth/register

## Problème rapporté
`POST /auth/register` renvoyait un `500 Internal Server Error` sans message exploitable
depuis `/register` sur le frontend.

## Cause racine
`apps/api/src/auth.service.ts` (méthode `register()`) exécutait plusieurs appels
Prisma (`user.findFirst`, `user.findUnique`) et Supabase Admin (`auth.admin.createUser`)
sans `try/catch`. Et `apps/api/src/main.ts` n'avait aucun filtre d'exception global.

Résultat : la moindre erreur imprévue (base de données injoignable, schéma désynchronisé,
appel réseau Supabase en échec, etc.) n'était pas transformée en réponse HTTP propre —
NestJS retombait sur son comportement par défaut : un `500` muet, sans log, sans message.

## Bug secondaire découvert
La migration `supabase/migrations/20260914120000_v10_auth_hardening.sql` a réécrit
la fonction `handle_new_user()` (trigger sur `auth.users`) et a supprimé, sans le
vouloir, l'insertion dans `public.wallets` qui existait dans la version V4. Depuis
cette migration, un nouvel utilisateur avait un profil mais **aucun wallet**.

## Corrections apportées

1. **`apps/api/src/auth.service.ts`**
   - `register()` et `login()` : chaque appel Prisma/Supabase est maintenant dans un
     `try/catch` qui logue l'erreur complète côté serveur (`Logger.error` avec stack
     trace) et renvoie un message clair en français côté client (`BadRequestException`)
     au lieu de laisser l'exception remonter brute.
   - `register()` crée désormais explicitement le wallet
     (`this.p.wallet.upsert(...)`) en filet de sécurité applicatif, en plus du trigger SQL.

2. **`apps/api/src/common/all-exceptions.filter.ts`** *(nouveau fichier)*
   - Filtre d'exception global : toute exception non prévue, sur n'importe quelle
     route de l'API (pas seulement `/auth`), est désormais loguée avec son message et
     sa stack trace complète dans les logs serveur, et renvoie un message générique
     (sans fuite d'info sensible) au client.

3. **`apps/api/src/main.ts`**
   - Enregistrement du filtre global via `app.useGlobalFilters(new AllExceptionsFilter())`.

4. **`supabase/migrations/20260917100000_v13_fix_missing_wallet_on_register.sql`**
   *(nouveau fichier, à appliquer sur Supabase)*
   - Restaure l'insertion `public.wallets` dans `handle_new_user()`.
   - Rattrape (backfill) les comptes déjà créés depuis V10 qui n'ont pas de wallet.

## Ce qu'il te reste à faire

1. Appliquer la nouvelle migration sur ton projet Supabase (SQL Editor, ou méthode
   Supabase habituelle) : `supabase/migrations/20260917100000_v13_fix_missing_wallet_on_register.sql`.
2. Relancer l'API (`npm run dev -w apps/api`) et retester `/register`.
3. Si une erreur survient encore, elle sera maintenant **loguée avec le détail complet**
   dans le terminal de l'API (grâce au filtre global) — envoie-moi ce log s'il y en a un,
   je pourrai corriger précisément la cause réelle (ex. mauvaise valeur d'env,
   `DATABASE_URL` incorrect, etc.).

## Vérifications effectuées ici (sans accès à ta base Supabase réelle)
- `npm install --workspace=apps/api` : OK (411 paquets).
- `npx tsc --noEmit -p apps/api` : aucune erreur sur les 3 fichiers modifiés/créés
  (`auth.service.ts`, `main.ts`, `common/all-exceptions.filter.ts`).
- Limite honnête : `prisma generate` n'a pas pu télécharger le moteur Prisma dans cet
  environnement sandboxé (domaine `binaries.prisma.sh` non autorisé pour moi ici), donc
  je n'ai pas pu exécuter l'application réellement ni valider le typage complet contre
  ton schéma Prisma. Aucune fonctionnalité existante n'a été supprimée ni réécrite ;
  seuls les blocs indiqués ci-dessus ont été ajoutés/modifiés.
