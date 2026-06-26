-- Migration: Allow public SELECT on active branches
-- Complementa 20260627_branches_rls.sql
-- Las tablas públicas (services, business_hours, inventory_products) ya permiten
-- SELECT público. branches necesita lo mismo para BookingPage y BarberiaPage.

CREATE POLICY "public_select_active_branches" ON branches
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
