-- ============================================================
-- Migration: Update commercial plan prices and limits
-- Date: 2026-07-05
-- Precios oficiales (PYG, sin decimales):
--   Básico:        Gs. 100.000  (3 barberos, 1 sucursal)
--   Profesional:   Gs. 150.000  (10 barberos, 3 sucursales)
--   Premium:       Gs. 200.000  (ilimitado)
-- Reservas y servicios ilimitados en los 3 planes.
-- ============================================================

-- Asegurar que existan los 3 planes con los valores correctos
INSERT INTO plans (slug, name, price, max_barbers, max_branches, max_monthly_bookings, is_active)
VALUES
  ('basic', 'Básico', 100000, 3, 1, 999999, true),
  ('professional', 'Profesional', 150000, 10, 3, 999999, true),
  ('premium', 'Premium', 200000, 999999, 999999, 999999, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  max_barbers = EXCLUDED.max_barbers,
  max_branches = EXCLUDED.max_branches,
  max_monthly_bookings = EXCLUDED.max_monthly_bookings,
  is_active = EXCLUDED.is_active;

-- Conservar registros históricos: no modificar businesses.plan ni subscriptions.
-- Los nuevos precios aplican a nuevas contrataciones/renovaciones.