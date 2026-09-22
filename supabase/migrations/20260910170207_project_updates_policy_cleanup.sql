begin;
drop policy if exists updates_admin on public.project_updates;
drop policy if exists updates_read on public.project_updates;
create policy updates_read on public.project_updates for select to public using (exists (select 1 from public.projects p where p.id = project_updates.project_id and (p.status <> 'DRAFT'::project_status or is_admin())));
create policy updates_admin on public.project_updates for insert to authenticated with check (is_admin());
create policy updates_admin_update on public.project_updates for update to authenticated using (is_admin()) with check (is_admin());
create policy updates_admin_delete on public.project_updates for delete to authenticated using (is_admin());
commit;
