begin;

-- Switch the default provider for all new deposits/withdrawals.
alter table public.deposits alter column provider set default 'paydunya';
alter table public.withdrawals alter column provider set default 'paydunya';

-- Idempotent PayDunya callback processor for deposits and withdrawals.
create or replace function public.process_paydunya_webhook(
  p_provider_reference text,
  p_status text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deposits%rowtype;
  w public.withdrawals%rowtype;
  v_balance numeric;
  v_referrer_id uuid;
  v_status text := lower(coalesce(p_status, 'pending'));
begin
  if nullif(trim(p_provider_reference), '') is null then
    raise exception 'provider_reference is required';
  end if;

  select * into d
  from public.deposits
  where provider_reference = p_provider_reference
  for update;

  if found then
    if d.status = 'CONFIRMED'::deposit_status then
      return jsonb_build_object('ok', true, 'already_processed', true, 'type', 'deposit', 'deposit_id', d.id);
    end if;

    if v_status in ('completed', 'success', 'paid', 'confirmed') then
      update public.wallets
      set balance = balance + d.amount, updated_at = now()
      where user_id = d.user_id
      returning balance into v_balance;
      if not found then raise exception 'Wallet not found'; end if;

      insert into public.transactions(user_id, type, amount, balance_after, reference, metadata)
      values(d.user_id, 'DEPOSIT'::tx_type, d.amount, v_balance, 'DEP-'||d.id::text,
        jsonb_build_object('deposit_id', d.id, 'provider_reference', p_provider_reference, 'provider', 'paydunya'))
      on conflict (reference) do nothing;

      update public.deposits
      set status='CONFIRMED'::deposit_status,
          confirmed_at=now(),
          metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb)
      where id=d.id;

      insert into public.notifications(user_id,title,message)
      values(d.user_id,'Dépôt confirmé','Votre dépôt PayDunya a été crédité sur votre portefeuille.');

      -- Fixed referral bonus: 500 XOF to both referrer and referred user,
      -- paid once when the referred user's first deposit is confirmed.
      if not exists (select 1 from public.referrals r where r.referred_user_id=d.user_id and r.reward_paid=true) then
        update public.referrals r
        set reward_amount=500, reward_paid=true, rewarded_at=now(),
            referred_reward_paid=true, referred_rewarded_at=now()
        where r.referred_user_id=d.user_id and r.reward_paid=false
        returning r.referrer_id into v_referrer_id;

        if v_referrer_id is not null then
          update public.wallets set balance=balance+500, updated_at=now()
          where user_id=v_referrer_id returning balance into v_balance;
          insert into public.transactions(user_id,type,amount,balance_after,reference,metadata)
          values(v_referrer_id,'REFERRAL_REWARD'::tx_type,500,v_balance,'REF-REFERRER-'||d.id::text,
            jsonb_build_object('deposit_id',d.id,'referred_user_id',d.user_id,'fixed_reward',true))
          on conflict(reference) do nothing;
          insert into public.notifications(user_id,title,message)
          values(v_referrer_id,'Prime de parrainage','Vous avez reçu 500 XOF pour votre filleul.');

          update public.wallets set balance=balance+500, updated_at=now()
          where user_id=d.user_id returning balance into v_balance;
          insert into public.transactions(user_id,type,amount,balance_after,reference,metadata)
          values(d.user_id,'REFERRAL_REWARD'::tx_type,500,v_balance,'REF-REFERRED-'||d.id::text,
            jsonb_build_object('deposit_id',d.id,'referrer_id',v_referrer_id,'fixed_reward',true))
          on conflict(reference) do nothing;
          insert into public.notifications(user_id,title,message)
          values(d.user_id,'Bonus de bienvenue','Vous avez reçu 500 XOF de bonus de parrainage.');
        end if;
      end if;

      return jsonb_build_object('ok', true, 'type', 'deposit', 'deposit_id', d.id, 'status', 'CONFIRMED');
    end if;

    update public.deposits
    set status = case
      when v_status in ('cancelled','canceled') then 'CANCELLED'::deposit_status
      when v_status = 'failed' then 'FAILED'::deposit_status
      else 'PENDING'::deposit_status
    end,
    metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb)
    where id=d.id;

    return jsonb_build_object('ok', true, 'type', 'deposit', 'deposit_id', d.id, 'status', v_status);
  end if;

  select * into w
  from public.withdrawals
  where provider_reference = p_provider_reference
  for update;

  if found then
    if v_status in ('success', 'completed') then
      update public.withdrawals
      set status='COMPLETED'::withdrawal_status,
          processed_at=now(),
          metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb)
      where id=w.id;
      insert into public.notifications(user_id,title,message)
      values(w.user_id,'Retrait effectué','Votre retrait PayDunya a été effectué avec succès.');
      return jsonb_build_object('ok', true, 'type', 'withdrawal', 'withdrawal_id', w.id, 'status', 'COMPLETED');
    elsif v_status in ('failed','cancelled','canceled') then
      if w.status not in ('REJECTED'::withdrawal_status, 'CANCELLED'::withdrawal_status) then
        update public.wallets
        set balance = balance + w.amount, updated_at=now()
        where user_id=w.user_id
        returning balance into v_balance;
        if not found then raise exception 'Wallet not found'; end if;

        insert into public.transactions(user_id,type,amount,balance_after,reference,metadata)
        values(w.user_id,'REFUND'::tx_type,w.amount,v_balance,'WD-REFUND-'||w.id::text,
          jsonb_build_object('withdrawal_id',w.id,'provider_reference',p_provider_reference,'provider','paydunya','reason',v_status))
        on conflict (reference) do nothing;

        update public.withdrawals
        set status = case when v_status in ('cancelled','canceled') then 'CANCELLED'::withdrawal_status else 'REJECTED'::withdrawal_status end,
            processed_at=now(),
            metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb)
        where id=w.id;
        insert into public.notifications(user_id,title,message)
        values(w.user_id,'Retrait non abouti','Votre retrait PayDunya n’a pas abouti et le montant a été recrédité.');
      end if;
      return jsonb_build_object('ok', true, 'type', 'withdrawal', 'withdrawal_id', w.id, 'status', v_status);
    else
      update public.withdrawals
      set status='PROCESSING'::withdrawal_status,
          metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb)
      where id=w.id;
      return jsonb_build_object('ok', true, 'type', 'withdrawal', 'withdrawal_id', w.id, 'status', 'PROCESSING');
    end if;
  end if;

  return jsonb_build_object('ok', false, 'reason', 'provider_reference_not_found');
end;
$$;

revoke execute on function public.process_paydunya_webhook(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.process_paydunya_webhook(text,text,jsonb) to service_role;

commit;
