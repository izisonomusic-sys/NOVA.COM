# nova.com V15 — règles rendement, projets et parrainage

## Rendement
- Tous les nouveaux investissements utilisent un rendement fixe de **17 % par jour**.
- Le rendement quotidien est calculé au moment de l'investissement et enregistré dans `investments.daily_profit`.
- Le gain total attendu est `daily_profit × duration_days`.
- À l'échéance, le capital initial est restitué en plus des rendements déjà crédités quotidiennement.
- Le moteur NestJS `InvestmentSettlementService` exécute le règlement toutes les 5 minutes et crédite les jours échus.

### Exemple 3 000 XOF / 15 jours
- 17 % / jour = 510 XOF / jour
- 15 jours = 7 650 XOF de rendement
- Capital restitué = 3 000 XOF
- Total récupéré = 10 650 XOF
- Rendement cumulé = 255 % du capital

## Création d'un projet
Seul `SUPER_ADMIN` peut créer/modifier/publier un projet. Les champs enregistrés sont notamment :
- titre
- slug
- catégorie
- description
- image de couverture (`coverUrl`)
- objectif
- montant minimum d'investissement
- durée
- dates de publication/démarrage/fin
- statut
- montant déjà collecté

L'interface d'administration affiche un aperçu de l'image et calcule immédiatement le gain/jour, le gain total et le total récupéré.

## Affichage public d'un projet
La page projet affiche :
- image du projet
- montant minimum
- durée
- rendement 17 %/jour
- gain/jour selon le montant saisi
- rendement cumulé sur toute la durée
- gain total
- capital + gain
- bouton `Investir maintenant`

## Parrainage
- Après le premier dépôt **confirmé** du filleul, le parrain reçoit **500 XOF** sur son portefeuille principal.
- Le filleul reçoit également **500 XOF** sur son portefeuille principal.
- Le bonus est attribué une seule fois par filleul.
- Les crédits sont enregistrés dans `transactions` avec le type `REFERRAL_REWARD`.
- Un retrait est refusé tant que l'utilisateur n'a pas investi au moins une fois dans un projet.

## Paiement / PayDunya
Le webhook PayDunya applique la règle de bonus après confirmation du dépôt. La sélection TMoney reste compatible avec le correctif PayDunya précédent.

## Limite actuelle de l'automatisation
Le règlement quotidien dépend du processus NestJS actif (`@Cron('*/5 * * * *')`). Le dépôt et le webhook PayDunya restent gérés par Supabase/PayDunya.
