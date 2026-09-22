begin;
-- nova.com: projects without a custom return plan use expected_return_pct as DAILY rate.
-- Existing projects with return_plans keep their configured plan.
update public.projects set expected_return_pct = 17 where expected_return_pct = 0 and jsonb_array_length(coalesce(return_plans,'[]'::jsonb)) = 0;
commit;
