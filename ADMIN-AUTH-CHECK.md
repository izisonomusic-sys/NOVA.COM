# Vérification auth / administration NOVA

## Session utilisateur
- Le client web sérialise maintenant les refresh tokens : une seule requête `/auth/refresh` peut être active à la fois.
- Après un refresh, le nouveau access token et le refresh token sont stockés dans `localStorage` et le cookie `nova_access_token` est mis à jour.
- Une erreur réseau temporaire ne provoque plus une redirection vers `/login` depuis le dashboard.
- Une redirection vers `/login` n'arrive que lorsque l'API renvoie réellement `401` après l'échec du refresh.

## Administration
- `/admin` vérifie d'abord `/profile` et n'affiche la console qu'à un profil `SUPER_ADMIN`.
- Les routes API `/admin/*` restent protégées par `JwtAuthGuard` + contrôle `SUPER_ADMIN`.
- Le ZIP actuel ne contient pas de formulaire de création d'un deuxième compte administrateur. Le fondateur `SUPER_ADMIN` est le compte d'administration prévu.
- Le script `db:seed` a été aligné sur l'authentification par téléphone : `ADMIN_PHONE`, `ADMIN_PASSWORD`, et alias email interne dérivé du téléphone.
