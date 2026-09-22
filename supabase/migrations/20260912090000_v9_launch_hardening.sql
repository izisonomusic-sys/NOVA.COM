begin;

-- V9 launch defaults. Existing values are preserved.
insert into public.platform_settings(key,value) values
  ('minimum_deposit','1000'::jsonb),
  ('minimum_withdrawal','1000'::jsonb),
  ('referral_investment_pct','2'::jsonb),
  ('currency','\"XOF\"'::jsonb)
on conflict (key) do nothing;

-- Supabase Auth is the source of truth for phone uniqueness; this index
-- protects the application profile table as well.
create unique index if not exists profiles_phone_unique_idx
  on public.profiles(phone) where phone is not null;

create index if not exists projects_status_created_idx
  on public.projects(status, created_at desc);
create index if not exists transactions_user_type_created_idx
  on public.transactions(user_id, type, created_at desc);

commit;
