-- Migration: Crear tabla branches y agregar branch_id a tablas existentes
-- Ejecutar en Supabase Dashboard > SQL Editor
-- Fecha: 2026-06-26
--
-- Este script:
-- 1. Crea la tabla branches
-- 2. Crea una sucursal "Principal" para cada negocio existente
-- 3. Agrega columna branch_id a barbers, appointments, cash_movements, inventory_products, business_hours
-- 4. Backfillea los registros existentes con la sucursal Principal
-- 5. Crea índices para performance

-- 1. Crear tabla branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  google_maps_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, slug)
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_branches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branches_updated_at ON branches;
CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- 2. Crear sucursal "Principal" para cada negocio existente
INSERT INTO branches (business_id, name, slug, address, phone)
SELECT
  id,
  COALESCE(name, 'Principal'),
  'principal',
  address,
  phone
FROM businesses
WHERE NOT EXISTS (
  SELECT 1 FROM branches b WHERE b.business_id = businesses.id
);

-- 3. Agregar branch_id a tablas existentes
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE business_hours ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- 4. Backfill branch_id con la sucursal "Principal" de cada negocio
UPDATE barbers b SET branch_id = (
  SELECT br.id FROM branches br WHERE br.business_id = b.business_id LIMIT 1
) WHERE b.branch_id IS NULL;

UPDATE appointments a SET branch_id = (
  SELECT br.id FROM branches br WHERE br.business_id = a.business_id LIMIT 1
) WHERE a.branch_id IS NULL;

UPDATE cash_movements cm SET branch_id = (
  SELECT br.id FROM branches br
  JOIN cash_register cr ON cr.id = cm.register_id
  WHERE cr.business_id = br.business_id
  LIMIT 1
) WHERE cm.branch_id IS NULL;

UPDATE inventory_products ip SET branch_id = (
  SELECT br.id FROM branches br WHERE br.business_id = ip.business_id LIMIT 1
) WHERE ip.branch_id IS NULL;

UPDATE business_hours bh SET branch_id = (
  SELECT br.id FROM branches br WHERE br.business_id = bh.business_id LIMIT 1
) WHERE bh.branch_id IS NULL;

-- 5. Hacer NOT NULL después del backfill
-- DESCOMENTAR SOLO si el backfill completó correctamente:
-- ALTER TABLE barbers ALTER COLUMN branch_id SET NOT NULL;
-- ALTER TABLE appointments ALTER COLUMN branch_id SET NOT NULL;
-- ALTER TABLE cash_movements ALTER COLUMN branch_id SET NOT NULL;
-- ALTER TABLE inventory_products ALTER COLUMN branch_id SET NOT NULL;
-- ALTER TABLE business_hours ALTER COLUMN branch_id SET NOT NULL;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_branches_business_id ON branches(business_id);
CREATE INDEX IF NOT EXISTS idx_branches_slug ON branches(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_barbers_branch_id ON barbers(branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch_id ON appointments(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_branch_id ON cash_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_products_branch_id ON inventory_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_branch_id ON business_hours(branch_id);
