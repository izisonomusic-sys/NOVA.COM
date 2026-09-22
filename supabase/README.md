# Supabase

Ce dossier contient les migrations et la Edge Function nécessaires à nova.com.

- Project ref : `hagjibqjpytkwpktdbnx`
- Storage bucket : `projects`
- Edge Function de paiement : `paydunya-webhook`
- Migration de bascule PayDunya : `20260912110000_paydunya_payment_provider.sql`

Les anciennes migrations SasPay sont conservées uniquement comme historique de migration. La V9 crée les nouveaux dépôts/retraits avec `provider=paydunya`.

Ne committez jamais les clés privées Supabase ou PayDunya.
