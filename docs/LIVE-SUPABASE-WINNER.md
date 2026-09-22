# Winner — live Supabase integration

Project ref: `hagjibqjpytkwpktdbnx`

Project URL: `https://hagjibqjpytkwpktdbnx.supabase.co`

Applied migrations currently include:
- v4_platform_core
- v4_security_hardening
- v4_security_performance_cleanup
- v4_project_updates_policy_cleanup
- v4_financial_settlement_engine
- v4_saspay_webhook_processor

The `projects` Storage bucket already exists and is public-read with authenticated founder-only insert/update/delete policies.

The `saspay-webhook` Edge Function is deployed. It uses a custom webhook secret header because the payment provider webhook is not a user JWT request. Set `SASPAY_WEBHOOK_SECRET` as an Edge Function secret before production traffic.

Important: the exact SasPay API request/response paths remain environment-specific and must be populated from the merchant API contract. No undocumented endpoint is fabricated in this repository.
