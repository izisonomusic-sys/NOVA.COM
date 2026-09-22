begin;

alter table public.projects
  add column if not exists return_plans jsonb not null default '[]'::jsonb;

alter table public.investments
  add column if not exists daily_profit numeric(18,2) not null default 0,
  add column if not exists duration_days integer,
  add column if not exists paid_days integer not null default 0,
  add column if not exists last_profit_at timestamptz;

update public.investments i set duration_days=p.duration_days from public.projects p where i.project_id=p.id and i.duration_days is null;
alter table public.investments alter column duration_days set default 0;

create index if not exists idx_investments_daily_settlement
  on public.investments(status, maturity_at, last_profit_at);

create or replace function public.process_daily_investment_returns()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_due_days integer;
  v_day integer;
  v_profit numeric;
  v_balance numeric;
  v_ref text;
  v_duration integer;
  v_expected numeric;
  v_processed integer := 0;
begin
  for r in
    select i.id, i.user_id, i.amount, i.daily_profit, i.paid_days,
           i.expected_profit, i.maturity_at, i.invested_at,
           coalesce(nullif(i.duration_days,0),p.duration_days) as duration_days
      from public.investments i
      join public.projects p on p.id = i.project_id
     where i.status = 'ACTIVE'::investment_status
     order by i.maturity_at
     for update of i skip locked
  loop
    v_duration := greatest(r.duration_days, 0);

    if r.daily_profit > 0 then
      v_due_days := least(
        v_duration,
        greatest(0, floor(extract(epoch from (now() - r.invested_at)) / 86400)::integer)
      ) - r.paid_days;

      if v_due_days > 0 then
        for v_day in 1..v_due_days loop
          v_profit := r.daily_profit;
          v_ref := 'INV-PROFIT-' || r.id::text || '-' || (r.paid_days + v_day)::text;

          if not exists(select 1 from public.transactions t where t.reference = v_ref) then
            update public.wallets
               set balance = balance + v_profit,
                   updated_at = now()
             where user_id = r.user_id
             returning balance into v_balance;

            if not found then
              raise exception 'Wallet not found for user %', r.user_id;
            end if;

            insert into public.transactions(
              user_id, type, amount, balance_after, reference, metadata
            ) values (
              r.user_id,
              'PROFIT'::tx_type,
              v_profit,
              v_balance,
              v_ref,
              jsonb_build_object(
                'investment_id', r.id,
                'day', r.paid_days + v_day,
                'kind', 'DAILY_FIXED_RETURN'
              )
            );

            insert into public.notifications(user_id, title, message)
            values (
              r.user_id,
              'Rendement quotidien crédité',
              'Votre rendement de ' || to_char(v_profit, 'FM999G999G999G990D00') || ' XOF a été crédité.'
            );
          end if;
        end loop;

        update public.investments
           set paid_days = least(v_duration, paid_days + v_due_days),
               last_profit_at = now(),
               total_return = amount + (daily_profit * least(v_duration, paid_days + v_due_days))
         where id = r.id;
      end if;

      if r.paid_days + greatest(v_due_days, 0) >= v_duration
         and r.maturity_at <= now() then
        v_ref := 'SETTLE-' || r.id::text;

        if not exists(select 1 from public.transactions t where t.reference = v_ref || '-PRINCIPAL') then
          update public.wallets
             set balance = balance + r.amount,
                 updated_at = now()
           where user_id = r.user_id
           returning balance into v_balance;

          if not found then
            raise exception 'Wallet not found for user %', r.user_id;
          end if;

          insert into public.transactions(
            user_id, type, amount, balance_after, reference, metadata
          ) values (
            r.user_id,
            'PRINCIPAL_RETURN'::tx_type,
            r.amount,
            v_balance,
            v_ref || '-PRINCIPAL',
            jsonb_build_object('investment_id', r.id, 'kind', 'MATURITY_PRINCIPAL')
          );

          update public.investments
             set status = 'MATURED'::investment_status,
                 total_return = amount + expected_profit,
                 settled_at = now(),
                 settlement_reference = v_ref
           where id = r.id and status = 'ACTIVE'::investment_status;

          insert into public.notifications(user_id, title, message)
          values (
            r.user_id,
            'Investissement arrivé à échéance',
            'Votre capital de ' || to_char(r.amount, 'FM999G999G999G990D00') || ' XOF a été restitué.'
          );
          v_processed := v_processed + 1;
        end if;
      end if;
    else
      -- Compatibilité avec les anciens investissements : le profit historique
      -- est crédité à l'échéance comme dans la version précédente.
      if r.maturity_at <= now() then
        v_ref := 'SETTLE-' || r.id::text;
        if not exists(select 1 from public.transactions t where t.reference = v_ref || '-PRINCIPAL') then
          update public.wallets
             set balance = balance + r.amount + r.expected_profit,
                 updated_at = now()
           where user_id = r.user_id
           returning balance into v_balance;

          if not found then
            raise exception 'Wallet not found for user %', r.user_id;
          end if;

          insert into public.transactions(user_id,type,amount,balance_after,reference,metadata)
          values(r.user_id,'PRINCIPAL_RETURN'::tx_type,r.amount,v_balance,v_ref||'-PRINCIPAL',jsonb_build_object('investment_id',r.id));

          if r.expected_profit > 0 then
            select balance into v_balance from public.wallets where user_id=r.user_id;
            insert into public.transactions(user_id,type,amount,balance_after,reference,metadata)
            values(r.user_id,'PROFIT'::tx_type,r.expected_profit,v_balance,v_ref||'-PROFIT',jsonb_build_object('investment_id',r.id));
          end if;

          update public.investments
             set status='MATURED'::investment_status,
                 total_return=r.amount+r.expected_profit,
                 settled_at=now(),
                 settlement_reference=v_ref
           where id=r.id and status='ACTIVE'::investment_status;

          insert into public.notifications(user_id,title,message)
          values(r.user_id,'Investissement arrivé à échéance','Votre capital et votre rendement ont été crédités sur votre portefeuille.');
          v_processed := v_processed + 1;
        end if;
      end if;
    end if;
  end loop;

  return v_processed;
end;
$$;

revoke execute on function public.process_daily_investment_returns() from public, anon, authenticated;
grant execute on function public.process_daily_investment_returns() to service_role;

-- Keep the old function name as a compatibility wrapper for existing scheduler calls.
create or replace function public.settle_matured_investments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.process_daily_investment_returns();
end;
$$;

revoke execute on function public.settle_matured_investments() from public, anon, authenticated;
grant execute on function public.settle_matured_investments() to service_role;

commit;
