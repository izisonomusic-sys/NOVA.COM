# NOVA-INVEST V12 – Dépôt et retrait

Cette version conserve l'interface existante de NOVA-INVEST.

Ajouts uniquement :
- `/deposit` : écran dédié de dépôt avec choix TMoney, Moov Money ou Mixx, montants rapides et montant personnalisé.
- `/withdraw` : écran dédié de retrait avec choix opérateur, numéro de téléphone et montants rapides.
- Les boutons `Déposer` et `Retirer` du tableau de bord et du profil ouvrent ces nouveaux écrans.
- `/wallet` reste inchangé pour l'historique et les fonctions existantes.
- Le choix de l'opérateur est enregistré dans les métadonnées de l'ordre.

Important : le prestataire réellement utilisé pour encaisser/décaisser reste celui configuré côté API (PayDunya dans ce projet). Le choix TMoney/Moov/Mixx affiché dans l'interface ne crée pas à lui seul une nouvelle intégration API directe avec chaque opérateur : la disponibilité réelle dépend des moyens activés dans le compte prestataire.
