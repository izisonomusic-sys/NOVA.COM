-- nova.com V5 brand/runtime settings
insert into public.platform_settings(key,value) values
 ('brand_name','"nova.com"'::jsonb),
 ('brand_tagline','"INVESTISSEMENT • IMPACT • AVENIR"'::jsonb),
 ('frontend_url','"http://localhost:3000"'::jsonb),
 ('referral_investment_pct','2'::jsonb)
on conflict(key) do update set value=excluded.value,updated_at=now();
