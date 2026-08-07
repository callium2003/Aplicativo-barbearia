-- Migration: Revoke explicit execute privilege on professional commission RPCs from anon
-- Created: 2026-08-06

REVOKE ALL ON FUNCTION public.get_professional_commission_rates(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_professional_commission_rates(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_professional_commission_rates(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_professional_commission_rates(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.set_professional_commission_rate(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_professional_commission_rate(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.set_professional_commission_rate(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_professional_commission_rate(uuid, text) TO authenticated;
