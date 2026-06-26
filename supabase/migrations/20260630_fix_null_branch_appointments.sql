-- Migration: Asignar branch_id a reservas que quedaron con NULL
-- Creadas antes de que BookingPage incluyera branch_id en el insert

UPDATE appointments
SET branch_id = (
  SELECT id FROM branches
  WHERE business_id = appointments.business_id
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE branch_id IS NULL;
