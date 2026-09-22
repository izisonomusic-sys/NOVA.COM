# Winner V4 — live integration status

This ZIP is synchronized to the live Supabase project `winner` (`hagjibqjpytkwpktdbnx`).

## Live components
- PostgreSQL schema: applied through Supabase migrations.
- RLS: enabled on application tables and security advisor is clean after the V4 hardening migration.
- Storage bucket: `projects`, public read, founder-only write/update/delete.
- Edge Function: `saspay-webhook`, deployed and ACTIVE.
- Financial settlement function: `settle_matured_investments()`, callable by the trusted API service.
- The live project does not expose the `cron` schema in this environment, so settlement is also wired into the NestJS scheduler in the API.
- SasPay deposit processor: `process_saspay_webhook()`.

## Application/database alignment
The Prisma schema in this ZIP maps directly to the existing Supabase `public` schema. Authentication is handled by Supabase Auth; the application no longer stores passwords in its own database.

## Required secrets
Set these server-side only:
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SASPAY_WEBHOOK_SECRET`
- real SasPay API URL/paths/credentials from the merchant contract

Never put `SUPABASE_SECRET_KEY` or SasPay secrets in the Next.js frontend.

## SasPay webhook
The Edge Function currently authenticates with `x-saspay-webhook-secret`. Replace/adapt that verification to the exact SasPay webhook signature scheme from the merchant API documentation before production.

## Important deployment note
Do not run `prisma migrate dev` against the existing Winner production database. The live schema is maintained by Supabase SQL migrations; Prisma is used as the typed application ORM and `prisma migrate deploy` is a no-op baseline in this repository.
