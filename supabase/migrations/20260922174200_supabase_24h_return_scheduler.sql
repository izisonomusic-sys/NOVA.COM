begin;

-- nova.com: rendement fixed at 17% per 24-hour period.
insert into public.platform_settings(key,value)
values ('fixed_daily_return_pct','17'::jsonb), ('return_interval_hours','24'::jsonb)
on conflict(key) do update set value=excluded.value, updated_at=now();

-- Ensure every active investment is settled only after complete 24h periods
-- since invested_at. The function is idempotent through unique transaction refs.
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
  v_processed integer := 0;
begin
  for r in
    select i.id, i.user_id, i.amount, i.daily_profit, i.paid_days,
           i.expected_profit, i.maturity_at, i.invested_at,
           coalesce(nullif(i.duration_days,0),p.duration_days) as duration_days
      from public.investments i
      join public.projects p on p.id=i.project_id
     where i.status='ACTIVE'::investment_status
     order by i.maturity_at
     for update of i skip locked
  loop
    v_duration := greatest(r.duration_days,0);
    if r.daily_profit > 0 and v_duration > 0 then
      -- One rendement is due for each COMPLETE 24-hour interval.
      v_due_days := least(
        v_duration,
        greatest(0, floor(extract(epoch from (now()-r.invested_at))/86400)::integer)
      ) - r.paid_days;

      if v_due_days > 0 then
        for v_day in 1..v_due_days loop
          v_profit := r.daily_profit;
          v_ref := 'INV-PROFIT-'||r.id::text||'-'||(r.paid_days+v_day)::text;

          if not exists(select 1 from public.transactions where reference=v_ref) then
            update public.wallets
               set balance=balance+v_profit, updated_at=now()
             where user_id=r.user_id
             returning balance into v_balance;

            if not found then raise exception 'Wallet not found for user %',r.user_id; end if;

            insert into public.transactions(user_id,type,amount,balance_after,reference,metadata)
            values(r.user_id,'PROFIT'::tx_type,v_profit,v_balance,v_ref,
              jsonb_build_object(
                'investment_id',r.id,
                'day',r.paid_days+v_day,
                'kind','DAILY_FIXED_RETURN',
                'interval_hours',24,
                'rate_pct_per_day',17
              ));

            insert into public.notifications(user_id,title,message)
            values(r.user_id,'Rendement quotidien crédité',
              'Votre rendement de '||to_char(v_profit,'FM999G999G999G990D00')||' XOF a été crédité après 24 heures.');
          end if;
        end loop;

        update public.investments
           set paid_days=least(v_duration,paid_days+v_due_days),
               last_profit_at=r.invested_at+(least(v_duration,paid_days+v_due_days)*interval '24 hours'),
               total_return=amount+(daily_profit*least(v_duration,paid_days+v_due_days))
         where id=r.id;
      end if;

      if r.paid_days+greatest(v_due_days,0)>=v_duration and r.maturity_at<=now() then
        v_ref := 'SETTLE-'||r.id::text;
        if not exists(select 1 from public.transactions where reference=v_ref||'-PRINCIPAL') then
          update public.wallets set balance=balance+r.amount,updated_at=now()
           where user_id=r.user_id returning balance into v_balance;
          if not found then raise exception 'Wallet not found for user %',r.user_id; end if;

          insert into public.transactions(user_id,type,amount,balance_after,reference,metadata)
          values(r.user_id,'PRINCIPAL_RETURN'::tx_type,r.amount,v_balance,v_ref||'-PRINCIPAL',
            jsonb_build_object('investment_id',r.id,'kind','MATURITY_PRINCIPAL','interval_hours',24));

          update public.investments
             set status='MATURED'::investment_status,
                 total_return=amount+expected_profit,
                 settled_at=now(), settlement_reference=v_ref
           where id=r.id and status='ACTIVE'::investment_status;

          insert into public.notifications(user_id,title,message)
          values(r.user_id,'Investissement arrivé à échéance',
            'Votre capital de '||to_char(r.amount,'FM999G999G999G990D00')||' XOF a été restitué.');
          v_processed := v_processed+1;
        end if;
      end if;
    end if;
  end loop;
  return v_processed;
end;
$$;

revoke execute on function public.process_daily_investment_returns() from public,anon,authenticated;
grant execute on function public.process_daily_investment_returns() to service_role;

-- Supabase-side scheduler: checks every 5 minutes, but the function only credits
-- after a complete 24h interval. This avoids depending on the NestJS server.
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule('nova_daily_investment_returns')
where exists (select 1 from cron.job where jobname='nova_daily_investment_returns');
select cron.schedule('nova_daily_investment_returns','*/5 * * * *',$job$select public.process_daily_investment_returns();$job$);

commit;
