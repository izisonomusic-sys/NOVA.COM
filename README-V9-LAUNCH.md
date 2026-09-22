# nova.com — V9 Launch Pack

Cette version part de V9 PayDunya + rendement quotidien et ajoute une couche de lancement plus complète, avec une interface mobile inspirée du screenshot fourni : solde en tête, statut, Déposer/Retirer, indicateurs, raccourcis et navigation basse.

## Parcours utilisateur

1. Inscription avec prénom, nom, numéro international et mot de passe.
2. Confirmation du mot de passe.
3. Authentification sans OTP ni SMS.
4. Accès à l'accueil après vérification.
5. Dépôt via PayDunya.
6. Consultation des projets.
7. Bouton **Investir** sur chaque projet.
8. Débit atomique du wallet et création de l'investissement.
9. Crédit automatique du rendement quotidien après chaque période complète de 24 h.
10. Restitution du capital à l'échéance.
11. Retrait via PayDunya.
12. Parrainage, notifications et historique.

## Profil mobile

Le profil a été refait pour suivre la logique visuelle de l'image fournie :
- Solde disponible en premier.
- Statut du compte.
- Déposer / Retirer.
- Capital investi.
- Rendements reçus.
- Total dépôts.
- Total retraits.
- Investissements, historique, notifications, parrainage et bonus.
- Modification du nom, téléphone et mot de passe.

## Plans de rendement

Chaque projet accepte `returnPlans` :

```json
[
  {"min":3000,"max":4999,"dailyProfit":500,"durationDays":15},
  {"min":5000,"max":9999,"dailyProfit":900,"durationDays":20},
  {"min":10000,"max":null,"dailyProfit":2000,"durationDays":30}
]
```

Le backend choisit automatiquement le palier correspondant au montant investi.

## Fichier événements / APIs

- `apps/api/src/events/platform-events.ts` : contrat des événements métier.
- `apps/api/src/events/events.service.ts` : bus d'événements interne.
- `apps/api/src/config-external-apis.ts` : point central pour les intégrations externes.
- `.env.integrations.example` : variables à remplir pour PayDunya et les autres APIs.

Les clés secrètes ne doivent jamais être écrites dans le code source ou dans le ZIP partagé.

## Migration

Le dossier `supabase/migrations` contient la migration `20260912090000_v9_launch_hardening.sql` avec les valeurs par défaut de lancement et les index de protection.

Ne lancez pas `prisma migrate dev` contre le projet Supabase de production. Appliquez les migrations Supabase avec la méthode Supabase prévue pour votre environnement.

## Avant production

- Vérifier que le fournisseur Phone/SMS n’est pas utilisé par l’application et que `SUPABASE_SECRET_KEY` est configurée côté API.
- Passer `PAYDUNYA_MODE` de `mock` à `sandbox`, puis `live` après validation du compte PayDunya.
- Renseigner `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN`, les URLs callback/retour et `PAYDUNYA_WITHDRAW_MODE`.
- Configurer les URLs de callback/webhook.
- Vérifier les plans de rendement avec les conditions contractuelles de chaque projet.
- Tester inscription OTP, dépôt confirmé, investissement, crédit quotidien, échéance, retrait et remboursement en cas d'échec fournisseur.
- Créer/promouvoir le compte fondateur réel sans mettre ses identifiants dans le ZIP.
