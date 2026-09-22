begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id,email,phone,full_name,role,is_active)
  values (
    new.id,
    new.email,
    nullif(new.phone,''),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    'USER'::public.user_role,
    true
  )
  on conflict (id) do update set
    email=excluded.email,
    phone=excluded.phone,
    updated_at=now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname='on_auth_user_created'
      and tgrelid='auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

create or replace function public.prevent_client_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and old.role is distinct from new.role then
    raise exception 'Role changes are not allowed from the client';
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname='prevent_client_role_escalation'
      and tgrelid='public.profiles'::regclass
  ) then
    create trigger prevent_client_role_escalation
      before update on public.profiles
      for each row execute function public.prevent_client_role_escalation();
  end if;
end $$;

commit;
