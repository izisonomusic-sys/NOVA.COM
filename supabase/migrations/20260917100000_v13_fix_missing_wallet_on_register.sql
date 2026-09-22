-- V13: la migration V10 (20260914120000_v10_auth_hardening.sql) a remplacé
-- handle_new_user() en oubliant l'insert dans public.wallets présent en V4.
-- Résultat : depuis V10, chaque nouvel utilisateur a un profil mais pas de wallet.
-- Cette migration restaure la création du wallet dans le trigger et rattrape
-- (backfill) les comptes déjà créés sans wallet.

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

  insert into public.wallets(user_id) values(new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Backfill : crée le wallet manquant pour tout profil existant qui n'en a pas.
insert into public.wallets(user_id)
select p.id
from public.profiles p
left join public.wallets w on w.user_id = p.id
where w.user_id is null;

commit;
