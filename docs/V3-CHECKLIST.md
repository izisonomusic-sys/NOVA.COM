# V3 checklist de vérification

## Couverture fonctionnelle
- [x] Authentification email/mot de passe
- [x] Fondateur SUPER_ADMIN
- [x] Projets créés uniquement par le fondateur
- [x] Publication / pause / suppression
- [x] Investissement
- [x] Wallet + ledger transactionnel
- [x] Dépôt SasPay (adapter + mock)
- [x] Webhook SasPay
- [x] Retrait + validation admin
- [x] Rendement à maturité
- [x] Parrainage
- [x] Notifications
- [x] Profil
- [x] Supabase PostgreSQL
- [x] Supabase Storage signed upload
- [x] Supabase Edge Function webhook scaffold
- [x] Rate limiting NestJS
- [x] Helmet / CORS / validation

## À configurer avant production
- [ ] Identifiants Supabase réels
- [ ] Bucket `projects`
- [ ] Secrets de production
- [ ] Contrat API SasPay réel
- [ ] Signature webhook SasPay exacte
- [ ] Domaine HTTPS
- [ ] Email/SMS transactionnel si souhaité
- [ ] Règles juridiques et financières validées
- [ ] Tests de charge et tests de sécurité externes

## Tests métier indispensables
1. Dépôt confirmé deux fois -> un seul crédit.
2. Investissement concurrent -> jamais dépasser l'objectif.
3. Retrait concurrent -> jamais passer le solde en négatif.
4. Rendement arrivé à échéance -> crédit une seule fois.
5. Utilisateur normal -> impossible de créer/publier/modifier un projet.
6. Utilisateur désactivé -> connexion refusée.
7. Parrainage -> prime calculée une seule fois selon le réglage.
