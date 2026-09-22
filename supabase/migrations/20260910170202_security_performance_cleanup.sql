-- Applied to Winner project hagjibqjpytkwpktdbnx.
begin;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
alter function public.handle_new_user() set search_path = public;
alter function public.is_admin() set search_path = public;
alter function public.rls_auto_enable() set search_path = pg_catalog;
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);
create index if not exists idx_project_updates_project on public.project_updates(project_id);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
commit;
