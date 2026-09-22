# nova.com V10 — Audit A→Z et plan de fonctionnement

Date : 14 septembre 2026
Base : ZIP V9 PayDunya sans SMS fourni pour cette V10.

## Résultat global

La V9 possède déjà un socle fonctionnel important : Auth Supabase côté API, wallet, projets, investissement, rendement quotidien, parrainage, notifications, administration et intégration PayDunya.

La V10 conserve les briques fonctionnelles et corrige les principaux points UX/flux identifiés :
- tableau de bord d'accueil simplifié et recentré sur le solde et l'activité ;
- navigation mobile à 6 entrées : Accueil, Projets, Investir, Bonus, Parrain, Profil ;
- protection des routes privées via middleware ;
- conservation du token de refresh lors de la connexion ;
- cookie de présence de session pour la protection des routes Next.js ;
- après inscription/connexion, arrivée directe sur le tableau de bord ;
- accueil public affichant jusqu'à 6 projets publiés au lieu de limiter l'exposition à 3 ;
- page Bonus branchée sur les données de parrainage au lieu d'afficher des chiffres statiques.

## Matrice fonctionnelle

| Fonction | État V10 | Détail |
|---|---|---|
| Inscription téléphone + mot de passe | OK | Aucun SMS/OTP demandé |
| Connexion | OK | Supabase Auth via l'API, access + refresh token |
| Persistance de session | OK | localStorage + cookie de route |
| Routes privées | OK | middleware Next.js + contrôle API |
| Rôle SUPER_ADMIN | OK | Vérifié côté API par JwtAuthGuard |
| Création de projet | OK | Fondateur uniquement |
| Publication de projet | OK | Le statut passe à FUNDING |
| Projet sur Accueil | OK | Les projets publiés remontent automatiquement |
| Projet dans Projets | OK | Endpoint public /projects |
| Détail projet | OK | Plans, objectif, progression, actualités |
| Investir | OK | Débit atomique du wallet + création investissement |
| Rendement quotidien | OK | Fonction SQL idempotente + scheduler API |
| Restitution du capital | OK | À échéance |
| Wallet | OK | Solde + historique |
| Dépôt PayDunya | OK sous configuration | Le code utilise PayDunya ; les clés serveur doivent être renseignées |
| Webhook PayDunya | OK sous configuration | Traitement idempotent côté SQL/Edge Function |
| Retrait PayDunya | OK sous configuration | Flux PUSH côté serveur |
| Remboursement retrait échoué | OK | Le montant est recrédité |
| Parrainage | OK | Code/lien + récompense au premier investissement éligible |
| Bonus | CORRIGÉ V10 | Données réelles du module referrals |
| Notifications | OK | Création et lecture |
| Profil | OK | Solde, stats, identité, mot de passe |
| Administration utilisateurs | OK | Activation/suspension |
| Administration dépôts | OK | Consultation |
| Administration retraits | PARTIEL | L'UI historique existe ; le flux PayDunya doit être piloté par le callback final |
| Upload image projet | PARTIEL | API Storage présente, interface d'upload à finaliser |
| Édition avancée des projets | PARTIEL | API PATCH présente, formulaire admin V9 principalement orienté création |
| Analytics avancées | PARTIEL | KPI admin présents, graphiques avancés non présents |
| SMS/OTP | SUPPRIMÉ | Conforme à la demande V9/V10 |

## PayDunya

PayDunya reste le fournisseur de paiement de nova.com.

### Dépôt

1. L'utilisateur saisit le montant.
2. L'API crée le dépôt PENDING.
3. L'API demande une facture PayDunya.
4. L'utilisateur est redirigé vers PayDunya.
5. Le callback/webhook confirme le paiement.
6. `process_paydunya_webhook()` crédite le wallet une seule fois.
7. Une transaction et une notification sont créées.

### Retrait

1. L'utilisateur saisit montant + destination.
2. Le wallet est débité de façon transactionnelle.
3. L'API crée et soumet le décaissement PayDunya.
4. Le retrait reste PROCESSING tant que PayDunya n'a pas confirmé le résultat final.
5. Le callback confirme COMPLETED ou recrédite le wallet en cas d'échec.

## Configuration obligatoire avant production

Dans `apps/api/.env` :

- `PAYDUNYA_MODE=sandbox` pour commencer les tests réels de sandbox.
- `PAYDUNYA_MASTER_KEY`
- `PAYDUNYA_PRIVATE_KEY`
- `PAYDUNYA_TOKEN`
- `PAYDUNYA_CALLBACK_URL`
- `PAYDUNYA_RETURN_URL`
- `PAYDUNYA_CANCEL_URL`
- `PAYDUNYA_WITHDRAW_MODE`
- `PAYDUNYA_CURRENCY=XOF`

Ne jamais mettre les clés privées PayDunya dans Next.js, dans le navigateur ou dans Git.

## Inspiration UI

La V10 reprend les principes demandés : dashboard mobile-first, solde immédiatement visible, actions Déposer/Retirer, raccourcis Projets/Investissements/Bonus/Parrainage, navigation basse et console fondateur séparée.

L'analyse publique de la référence NutraGo/Nutra Group ne permet pas de vérifier de manière fiable ses écrans privés ou ses APIs. La V10 ne prétend donc pas copier des fonctionnalités privées non vérifiables ; elle applique plutôt les principes d'UX demandés au modèle nova.com.

## Vérification manuelle finale recommandée

Tester dans cet ordre :

1. Créer un compte test.
2. Se déconnecter.
3. Se reconnecter.
4. Ouvrir directement `/dashboard` sans session : redirection `/login`.
5. Ouvrir `/admin` avec un compte USER : l'API doit refuser.
6. Ouvrir `/admin` avec le SUPER_ADMIN.
7. Créer un projet.
8. Publier le projet.
9. Vérifier sa présence sur `/` et `/projects`.
10. Faire un dépôt PayDunya sandbox.
11. Vérifier le wallet après callback.
12. Investir dans le projet.
13. Vérifier le débit du wallet.
14. Vérifier le rendement quotidien.
15. Vérifier l'échéance et le retour du capital.
16. Tester un retrait PayDunya.
17. Vérifier le callback de retrait.
18. Créer un filleul et vérifier la récompense lors de son premier investissement.
19. Vérifier les notifications.
20. Vérifier le profil et la navigation mobile.

## Point important

Le code de paiement est présent, mais un ZIP ne peut pas rendre un compte PayDunya opérationnel sans les identifiants et URLs du compte marchand. Tant que `PAYDUNYA_MODE=mock`, le bouton de paiement est un mode de test. Pour une vraie transaction, passer d'abord en `sandbox`, puis en `live` après validation.
