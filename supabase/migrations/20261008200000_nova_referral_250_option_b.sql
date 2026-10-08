begin;

alter table public.referrals
  alter column bonus_amount set default 250;

update public.referrals
set bonus_amount = 250
where status in ('pending','eligible');

create or replace function private.nova_qualify_referrals_for_user(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  r public.referrals%rowtype;
  v_count bigint := 0;
  child_dep boolean;
  ref_bonus_ref text;
  child_bonus_ref text;
  legacy_ref_bonus_ref text;
  legacy_child_bonus_ref text;
  did_credit boolean;
begin
  if p_user_id is null then return 0; end if;

  for r in
    select *
    from public.referrals
    where (referrer_id = p_user_id or referred_user_id = p_user_id)
      and status in ('pending','eligible','credited')
    for update
  loop
    select exists(
      select 1
      from public.wallet_ledger l
      where l.user_id = r.referred_user_id
        and l.entry_type = 'deposit'
        and l.status = 'posted'
        and l.amount > 0
    ) into child_dep;

    legacy_ref_bonus_ref := 'REF-' || r.id::text || '-PARRAIN';
    legacy_child_bonus_ref := 'REF-' || r.id::text || '-FILLEUL';
    ref_bonus_ref := 'REF-BONUS-' || r.id::text || '-PARRAIN';
    child_bonus_ref := 'REF-BONUS-' || r.id::text || '-FILLEUL';

    if child_dep then
      did_credit := false;

      if not exists(
        select 1 from public.wallet_ledger
        where reference in (legacy_ref_bonus_ref, ref_bonus_ref)
          and status = 'posted'
      ) then
        perform private.nova_credit_bonus(
          r.referrer_id, r.bonus_amount, 'referral_bonus', ref_bonus_ref,
          'Bonus de parrainage — dépôt du filleul confirmé', r.referred_user_id
        );
        did_credit := true;
      end if;

      if not exists(
        select 1 from public.wallet_ledger
        where reference in (legacy_child_bonus_ref, child_bonus_ref)
          and status = 'posted'
      ) then
        perform private.nova_credit_bonus(
          r.referred_user_id, r.bonus_amount, 'referral_bonus', child_bonus_ref,
          'Bonus de bienvenue — dépôt confirmé', r.referrer_id
        );
        did_credit := true;
      end if;

      update public.referrals
      set status = 'credited',
          referrer_qualified_at = coalesce(referrer_qualified_at, now()),
          referred_qualified_at = coalesce(referred_qualified_at, now())
      where id = r.id;

      if did_credit then v_count := v_count + 1; end if;
    else
      update public.referrals set status = 'pending'
      where id = r.id and status <> 'credited';
    end if;
  end loop;

  return v_count;
end
$function$;

revoke execute on function private.nova_qualify_referrals_for_user(uuid) from public, anon, authenticated;
grant execute on function private.nova_qualify_referrals_for_user(uuid) to service_role;

commit;