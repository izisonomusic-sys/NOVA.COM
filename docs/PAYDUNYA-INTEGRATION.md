# Intégration PayDunya

Le provider de paiement est `apps/api/src/payments/paydunya.provider.ts`.

## Dépôts

La V9 utilise l'API PayDunya **Paiement Avec Redirection (PAR)** :

- Sandbox : `https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create`
- Production : `https://app.paydunya.com/api/v1/checkout-invoice/create`

La création d'une facture renvoie un `token` et une URL de checkout. Le frontend redirige l'utilisateur vers cette URL. PayDunya peut notifier le backend via l'IPN/callback `application/x-www-form-urlencoded`; le code extrait `data`, vérifie le hash SHA-512 du `PAYDUNYA_MASTER_KEY`, puis appelle le RPC idempotent `process_paydunya_webhook()`.

## Retraits

La V9 utilise l'API PayDunya PUSH :

1. `POST /v2/disburse/get-invoice`
2. `POST /v2/disburse/submit-invoice`
3. callback PayDunya pour le statut final.

Le moyen de retrait est configurable avec `PAYDUNYA_WITHDRAW_MODE` et la devise est XOF.

## Variables serveur

- `PAYDUNYA_MODE=mock|sandbox|live`
- `PAYDUNYA_API_BASE_URL` (optionnel : permet de surcharger l'URL de base)
- `PAYDUNYA_MASTER_KEY`
- `PAYDUNYA_PRIVATE_KEY`
- `PAYDUNYA_TOKEN`
- `PAYDUNYA_CALLBACK_URL`
- `PAYDUNYA_RETURN_URL`
- `PAYDUNYA_CANCEL_URL`
- `PAYDUNYA_WITHDRAW_MODE`
- `PAYDUNYA_DEBIT_ACCOUNT_NUMBER` (optionnel)
- `PAYDUNYA_CURRENCY=XOF`
- `PAYDUNYA_STORE_NAME`
- `PAYDUNYA_STORE_TAGLINE`
- `PAYDUNYA_STORE_WEBSITE_URL`

Ne mets jamais les clés PayDunya dans Next.js ni dans le ZIP partagé.

## Webhook

Endpoint backend : `POST /payments/webhooks/paydunya`.

Edge Function Supabase : `paydunya-webhook`.

Le callback PayDunya est traité en `application/x-www-form-urlencoded` avec la clé `data`. La signature documentée par PayDunya est le SHA-512 de la Master Key. La fonction vérifie ce hash avant d'appeler le RPC.

## Références officielles

- API HTTP/JSON PayDunya : https://developers.paydunya.com/doc/FR/http_json
- API PUSH PayDunya : https://developers.paydunya.com/doc/FR/api_deboursement
