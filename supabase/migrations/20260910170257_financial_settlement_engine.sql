begin;
create or replace function public.settle_matured_investments()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer:=0; r record; v_ref text; v_balance numeric;
begin
 for r in select i.id,i.user_id,i.amount,i.expected_profit from public.investments i where i.status='ACTIVE'::investment_status and i.maturity_at<=now() order by i.maturity_at for update skip locked loop
  v_ref:='SETTLE-'||r.id::text;
  if exists(select 1 from public.transactions t where t.reference=v_ref||'-PRINCIPAL') then
   update public.investments set status='MATURED'::investment_status,settled_at=coalesce(settled_at,now()),settlement_reference=v_ref where id=r.id and status='ACTIVE'::investment_status;
   continue;
  end if;
  update public.wallets set balance=balance+r.amount+r.expected_profit,updated_at=now() where user_id=r.user_id returning balance into v_balance;
  if not found then raise exception 'Wallet not found for user %',r.user_id; end if;
  insert into public.transactions(user_id,type,amount,balance_after,reference,metadata) values(r.user_id,'PRINCIPAL_RETURN'::tx_type,r.amount,v_balance,v_ref||'-PRINCIPAL',jsonb_build_object('investment_id',r.id));
  if r.expected_profit>0 then select balance into v_balance from public.wallets where user_id=r.user_id; insert into public.transactions(user_id,type,amount,balance_after,reference,metadata) values(r.user_id,'PROFIT'::tx_type,r.expected_profit,v_balance,v_ref||'-PROFIT',jsonb_build_object('investment_id',r.id)); end if;
  update public.investments set status='MATURED'::investment_status,total_return=r.amount+r.expected_profit,settled_at=now(),settlement_reference=v_ref where id=r.id and status='ACTIVE'::investment_status;
  insert into public.notifications(user_id,title,message) values(r.user_id,'Investissement arrivé à échéance','Votre capital et votre rendement ont été crédités sur votre portefeuille.');
  v_count:=v_count+1;
 end loop; return v_count;
end; $$;
revoke execute on function public.settle_matured_investments() from public,anon,authenticated;
grant execute on function public.settle_matured_investments() to service_role;
commit;
