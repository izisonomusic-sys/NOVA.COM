# NOVA-INVEST — configuration

## 1. Frontend
Créer `apps/web/.env.local` à partir de `apps/web/.env.local.example` :

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://TON-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TA_CLE_PUBLISHABLE
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=projects
```

## 2. API
Créer/compléter `apps/api/.env` :

```env
NODE_ENV=development
PORT=4000
SUPABASE_URL=https://TON-PROJET.supabase.co
SUPABASE_PUBLISHABLE_KEY=TA_CLE_PUBLISHABLE
SUPABASE_SECRET_KEY=TA_CLE_SECRET
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
FRONTEND_URL=http://localhost:3000
```

`SUPABASE_SECRET_KEY` (ou l'ancienne clé `service_role`) reste exclusivement côté API. Ne jamais la mettre dans `NEXT_PUBLIC_*`.

## 3. Vérification
Après `npm.cmd run dev`, ouvrir : `http://localhost:4000/public/health`.
Le résultat doit afficher `ok: true`, `database: true` et les quatre indicateurs Supabase/DB à `true`.

Si `supabaseSecretKey` vaut `false`, l'inscription ne peut pas utiliser le flux actuel : le serveur doit pouvoir créer l'utilisateur Auth sans SMS via l'API admin.

## 4. Inscription
Le flux est : formulaire → `/auth/register` → Supabase Auth admin → profil `profiles` → événement `user.registered` → session.

Les événements sont persistés dans `audit_logs` et consultables par le fondateur via `/admin/events`.
