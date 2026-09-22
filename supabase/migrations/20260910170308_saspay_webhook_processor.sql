begin;
create or replace function public.process_saspay_webhook(p_provider_reference text,p_status text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.deposits%rowtype; v_balance numeric; v_status public.deposit_status;
begin
 if nullif(trim(p_provider_reference),'') is null then raise exception 'provider_reference is required'; end if;
 v_status:=case upper(p_status) when 'CONFIRMED' then 'CONFIRMED'::deposit_status when 'SUCCESS' then 'CONFIRMED'::deposit_status when 'PAID' then 'CONFIRMED'::deposit_status when 'FAILED' then 'FAILED'::deposit_status when 'CANCELLED' then 'CANCELLED'::deposit_status else 'PENDING'::deposit_status end;
 select * into d from public.deposits where provider_reference=p_provider_reference for update;
 if not found then return jsonb_build_object('ok',false,'reason','deposit_not_found'); end if;
 if d.status='CONFIRMED'::deposit_status then return jsonb_build_object('ok',true,'already_processed',true,'deposit_id',d.id); end if;
 if v_status='CONFIRMED'::deposit_status then
  update public.wallets set balance=balance+d.amount,updated_at=now() where user_id=d.user_id returning balance into v_balance;
  if not found then raise exception 'Wallet not found'; end if;
  insert into public.transactions(user_id,type,amount,balance_after,reference,metadata) values(d.user_id,'DEPOSIT'::tx_type,d.amount,v_balance,'DEP-'||d.id::text,jsonb_build_object('deposit_id',d.id,'provider_reference',p_provider_reference));
  update public.deposits set status='CONFIRMED'::deposit_status,confirmed_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb) where id=d.id;
  insert into public.notifications(user_id,title,message) values(d.user_id,'Dépôt confirmé','Votre dépôt a été crédité sur votre portefeuille.');
 else update public.deposits set status=v_status,metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_payload,'{}'::jsonb) where id=d.id; end if;
 return jsonb_build_object('ok',true,'deposit_id',d.id,'status',v_status::text);
end; $$;
revoke execute on function public.process_saspay_webhook(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.process_saspay_webhook(text,text,jsonb) to service_role;
commit;
