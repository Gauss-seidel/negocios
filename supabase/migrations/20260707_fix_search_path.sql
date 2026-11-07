-- ============================================================
-- Migration: Set search_path on SECURITY DEFINER functions
-- Date: 2026-07-07
-- ============================================================
ALTER FUNCTION public.auto_cash_on_completion() SET search_path = public;
ALTER FUNCTION public.check_barber_limit() SET search_path = public;
ALTER FUNCTION public.check_booking_limit() SET search_path = public;
ALTER FUNCTION public.check_cash_module_access() SET search_path = public;
ALTER FUNCTION public.check_module_access() SET search_path = public;
ALTER FUNCTION public.rls_auto_enable() SET search_path = public;