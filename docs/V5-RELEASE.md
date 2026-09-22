# nova.com V5 — release

## Objectif
V5 transforme le socle V4 en parcours testable de bout en bout : inscription → dépôt → wallet → investissement → rendement → retrait → parrainage.

## Branding / Hero
Le hero public de nova.com utilise `apps/web/public/nova-hero.png`, basé sur le visuel final fourni dans la session de design. Le nom affiché est `nova.com`.

## Auth / fondateur
Le projet Winner Supabase ne contient actuellement aucun utilisateur. La création du fondateur ne peut pas être exécutée depuis ce ZIP sans le secret Supabase Auth Admin. Le script `apps/api/prisma/seed.ts` est prévu pour cela avec `SUPABASE_SECRET_KEY`, `ADMIN_EMAIL` et `ADMIN_PASSWORD` côté serveur uniquement.

Procédure :
1. renseigner les secrets côté serveur ;
2. lancer `npm run db:seed` ;
3. vérifier que le profil devient `SUPER_ADMIN` ;
4. se connecter sur `/login`.

Ne jamais mettre `SUPABASE_SECRET_KEY` dans Next.js ou Git.

## Dépôt de test
`SASPAY_MODE=mock` permet de créer un dépôt puis de le confirmer via `POST /payments/mock/confirm`. Cette route est authentifiée et n'existe que pour le mode mock.

## SasPay production
Passer `SASPAY_MODE=api` uniquement après avoir renseigné les vrais paramètres de ton compte SasPay. Aucun endpoint privé n'est inventé.

## Rendement
Le moteur `settle_matured_investments()` est idempotent. En production, le scheduler NestJS exécute le règlement toutes les 5 minutes. `pg_cron` n'est pas supposé actif dans le projet.

## Checklist de test
- [ ] inscription
- [ ] connexion
- [ ] dépôt mock confirmé
- [ ] wallet crédité une seule fois malgré double confirmation
- [ ] investissement supérieur au minimum
- [ ] objectif du projet respecté
- [ ] récompense de parrainage unique
- [ ] maturité et crédit capital + profit
- [ ] retrait avec solde réservé/décrémenté
- [ ] retrait accepté par fondateur
- [ ] retrait refusé et recrédité
- [ ] webhook SasPay idempotent

## Live Winner / Supabase
Le projet cible est `winner` (`hagjibqjpytkwpktdbnx`), région `eu-west-1`, état `ACTIVE_HEALTHY`. Les tables publiques sont RLS-protected et le bucket Storage `projects` existe avec lecture publique et écriture réservée au fondateur.

La création du compte `SUPER_ADMIN` reste la seule étape nécessitant une action/secret Auth Admin qui n'est pas exposé par le connecteur dans cette session. Le seed serveur inclus sait créer/confirm l'utilisateur et lui attribuer `SUPER_ADMIN`.
