create type public.user_role as enum ('USER','SUPER_ADMIN');
create type public.project_status as enum ('DRAFT','PUBLISHED','FUNDING','FUNDED','ACTIVE','PAUSED','COMPLETED');
create type public.investment_status as enum ('ACTIVE','MATURED','CANCELLED','REFUNDED');
create type public.tx_type as enum ('DEPOSIT','INVESTMENT','PRINCIPAL_RETURN','PROFIT','WITHDRAWAL','REFERRAL_REWARD','REFUND','ADMIN_ADJUSTMENT');
create type public.deposit_status as enum ('PENDING','CONFIRMED','FAILED','CANCELLED');
create type public.withdrawal_status as enum ('PENDING','PROCESSING','COMPLETED','REJECTED','CANCELLED');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text unique,
 full_name text,
 phone text,
 role public.user_role not null default 'USER',
 referral_code text unique,
 referred_by uuid references public.profiles(id) on delete set null,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null,
 description text, category text not null default 'REAL_ESTATE', cover_url text,
 gallery_urls text[] not null default '{}', target_amount numeric(18,2) not null check(target_amount>0),
 raised_amount numeric(18,2) not null default 0 check(raised_amount>=0), min_investment numeric(18,2) not null default 100 check(min_investment>0),
 expected_return_pct numeric(18,4) not null check(expected_return_pct>=0), duration_days integer not null check(duration_days>0),
 status public.project_status not null default 'DRAFT', published_at timestamptz, starts_at timestamptz, ends_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.wallets (user_id uuid primary key references public.profiles(id) on delete cascade,balance numeric(18,2) not null default 0 check(balance>=0),locked_balance numeric(18,2) not null default 0 check(locked_balance>=0),updated_at timestamptz not null default now());
create table public.transactions (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),type public.tx_type not null,amount numeric(18,2) not null check(amount>0),balance_after numeric(18,2),reference text unique,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create table public.deposits (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),amount numeric(18,2) not null check(amount>0),provider text not null default 'saspay',provider_reference text unique,status public.deposit_status not null default 'PENDING',metadata jsonb not null default '{}',created_at timestamptz not null default now(),confirmed_at timestamptz);
create table public.investments (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),project_id uuid not null references public.projects(id),amount numeric(18,2) not null check(amount>0),expected_profit numeric(18,2) not null default 0,total_return numeric(18,2) not null default 0,status public.investment_status not null default 'ACTIVE',invested_at timestamptz not null default now(),maturity_at timestamptz not null,settled_at timestamptz,settlement_reference text unique);
create table public.withdrawals (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),amount numeric(18,2) not null check(amount>0),fee numeric(18,2) not null default 0,net_amount numeric(18,2) generated always as (amount-fee) stored,provider text not null default 'saspay',provider_reference text unique,status public.withdrawal_status not null default 'PENDING',destination jsonb not null default '{}',metadata jsonb not null default '{}',created_at timestamptz not null default now(),processed_at timestamptz);
create table public.referrals (id uuid primary key default gen_random_uuid(),referrer_id uuid not null references public.profiles(id),referred_user_id uuid unique not null references public.profiles(id),reward_amount numeric(18,2) not null default 0,reward_paid boolean not null default false,created_at timestamptz not null default now(),rewarded_at timestamptz);
create table public.project_updates (id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,title text not null,content text not null,created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,title text not null,message text not null,read_at timestamptz,created_at timestamptz not null default now());
create table public.audit_logs (id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id) on delete set null,action text not null,entity_type text,entity_id uuid,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create table public.platform_settings (key text primary key,value jsonb not null,updated_at timestamptz not null default now());

create index idx_projects_status on public.projects(status); create index idx_investments_user on public.investments(user_id); create index idx_investments_project on public.investments(project_id); create index idx_transactions_user_created on public.transactions(user_id,created_at desc); create index idx_deposits_user_status on public.deposits(user_id,status); create index idx_withdrawals_user_status on public.withdrawals(user_id,status); create index idx_notifications_user_created on public.notifications(user_id,created_at desc); create index idx_audit_logs_actor on public.audit_logs(actor_id); create index idx_profiles_referred_by on public.profiles(referred_by); create index idx_project_updates_project on public.project_updates(project_id); create index idx_referrals_referrer on public.referrals(referrer_id);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='SUPER_ADMIN' and is_active); $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,email,full_name,phone,referral_code) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),new.phone,upper(substr(replace(new.id::text,'-',''),1,8))) on conflict(id) do update set email=excluded.email; insert into public.wallets(user_id) values(new.id) on conflict(user_id) do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.platform_settings(key,value) values('referral_investment_pct','1'::jsonb) on conflict(key) do nothing;

alter table public.profiles enable row level security; alter table public.projects enable row level security; alter table public.wallets enable row level security; alter table public.transactions enable row level security; alter table public.deposits enable row level security; alter table public.investments enable row level security; alter table public.withdrawals enable row level security; alter table public.referrals enable row level security; alter table public.project_updates enable row level security; alter table public.notifications enable row level security; alter table public.audit_logs enable row level security; alter table public.platform_settings enable row level security;
create policy profiles_select on public.profiles for select to authenticated using(id=(select auth.uid()) or is_admin()); create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid()) or is_admin()) with check(id=(select auth.uid()) or is_admin());
create policy projects_public_read on public.projects for select to public using(status in ('PUBLISHED','FUNDING','FUNDED','ACTIVE','PAUSED','COMPLETED') or is_admin()); create policy projects_admin_insert on public.projects for insert to authenticated with check(is_admin()); create policy projects_admin_update on public.projects for update to authenticated using(is_admin()) with check(is_admin()); create policy projects_admin_delete on public.projects for delete to authenticated using(is_admin());
create policy wallet_select on public.wallets for select to authenticated using(user_id=(select auth.uid()) or is_admin());
create policy tx_select on public.transactions for select to authenticated using(user_id=(select auth.uid()) or is_admin());
create policy deposits_select on public.deposits for select to authenticated using(user_id=(select auth.uid()) or is_admin());
create policy investments_select on public.investments for select to authenticated using(user_id=(select auth.uid()) or is_admin());
create policy withdrawals_select on public.withdrawals for select to authenticated using(user_id=(select auth.uid()) or is_admin());
create policy referrals_select on public.referrals for select to authenticated using(referrer_id=(select auth.uid()) or referred_user_id=(select auth.uid()) or is_admin());
create policy updates_read on public.project_updates for select to public using(exists(select 1 from public.projects p where p.id=project_updates.project_id and (p.status<>'DRAFT' or is_admin()))); create policy updates_admin on public.project_updates for insert to authenticated with check(is_admin()); create policy updates_admin_update on public.project_updates for update to authenticated using(is_admin()) with check(is_admin()); create policy updates_admin_delete on public.project_updates for delete to authenticated using(is_admin());
create policy notifications_select on public.notifications for select to authenticated using(user_id=(select auth.uid()) or is_admin()); create policy notifications_update on public.notifications for update to authenticated using(user_id=(select auth.uid()) or is_admin()) with check(user_id=(select auth.uid()) or is_admin());
create policy audit_admin on public.audit_logs for select to authenticated using(is_admin()); create policy settings_admin on public.platform_settings for all to authenticated using(is_admin()) with check(is_admin());

insert into storage.buckets(id,name,public) values('projects','projects',true) on conflict(id) do update set public=true;
create policy projects_storage_public_read on storage.objects for select to public using(bucket_id='projects');
create policy projects_storage_admin_insert on storage.objects for insert to authenticated with check(bucket_id='projects' and public.is_admin());
create policy projects_storage_admin_update on storage.objects for update to authenticated using(bucket_id='projects' and public.is_admin()) with check(bucket_id='projects' and public.is_admin());
create policy projects_storage_admin_delete on storage.objects for delete to authenticated using(bucket_id='projects' and public.is_admin());
