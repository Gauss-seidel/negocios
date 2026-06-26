-- Migration: Fix business_hours unique constraint to include branch_id
-- La constraint original (business_id, day_of_week) impide tener horarios
-- diferentes por sucursal. La reemplazamos con (business_id, branch_id, day_of_week).

ALTER TABLE business_hours DROP CONSTRAINT IF EXISTS business_hours_business_id_day_of_week_key;
ALTER TABLE business_hours ADD CONSTRAINT business_hours_business_id_branch_id_day_of_week_key
  UNIQUE (business_id, branch_id, day_of_week);
