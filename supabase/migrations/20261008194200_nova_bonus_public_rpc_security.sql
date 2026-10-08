-- Security hardening: bonus SECURITY DEFINER wrappers must not be callable
-- through the public Supabase API roles. Trusted server-side execution only.

REVOKE EXECUTE ON FUNCTION public.nova_reconcile_referral_bonus(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.nova_reconcile_referral_bonus(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.nova_reconcile_referral_bonus(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.nova_reconcile_referral_bonus(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.nova_release_bonus_wallets() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.nova_release_bonus_wallets() FROM anon;
REVOKE EXECUTE ON FUNCTION public.nova_release_bonus_wallets() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.nova_release_bonus_wallets() TO service_role;
