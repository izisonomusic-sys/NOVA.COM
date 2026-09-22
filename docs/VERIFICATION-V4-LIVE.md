# V4 live verification

Verified against Supabase project `winner` (`hagjibqjpytkwpktdbnx`).

- Project status: ACTIVE_HEALTHY
- Region: eu-west-1
- Application tables: 12
- RLS: enabled on all 12 application tables
- Security advisor: 0 findings
- Storage bucket `projects`: present; public read; founder-only write/update/delete policies
- Edge Function `saspay-webhook`: ACTIVE, version 1
- Live migrations: v4_platform_core, v4_security_hardening, v4_security_performance_cleanup, v4_project_updates_policy_cleanup, v4_financial_settlement_engine, v4_saspay_webhook_processor, v4_profiles_email_for_app_identity
- Current live data: no profiles/users yet; 6 platform settings

Performance advisor currently reports only unused indexes because the database is essentially empty. This is expected before real traffic; the indexes are retained for production query paths.
