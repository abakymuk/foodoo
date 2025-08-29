-- Мультибрендовая модель: tenants → brands → locations (+ привязки)
-- T-01. База мультибрендов: tenants → brands → locations (+ привязки)

-- 1. Обновляем таблицу tenants (если нужно)
-- Убеждаемся, что у нас есть все необходимые поля
ALTER TABLE IF EXISTS tenants 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Обновляем существующие записи, если name пустой
UPDATE tenants 
SET name = COALESCE(name, brand_name, 'Demo Tenant') 
WHERE name IS NULL;

-- 2. Создаем таблицу brands
CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Уникальный индекс для slug в рамках tenant
CREATE UNIQUE INDEX IF NOT EXISTS brands_unique_slug ON brands(tenant_id, slug);

-- Индекс для производительности
CREATE INDEX IF NOT EXISTS brands_tenant_idx ON brands(tenant_id);

-- 3. Обновляем таблицу locations (добавляем недостающие поля)
ALTER TABLE IF EXISTS locations 
ADD COLUMN IF NOT EXISTS address JSONB,
ADD COLUMN IF NOT EXISTS tz TEXT CHECK (tz ~ '^[A-Za-z_]+/[A-Za-z_]+'),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Индекс для производительности (если еще не создан)
CREATE INDEX IF NOT EXISTS locations_tenant_idx ON locations(tenant_id);

-- 4. Создаем таблицу location_brands (связь many-to-many)
CREATE TABLE IF NOT EXISTS location_brands (
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (location_id, brand_id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS location_brands_loc_idx ON location_brands(location_id);
CREATE INDEX IF NOT EXISTS location_brands_brand_idx ON location_brands(brand_id);

-- 5. Включаем RLS на всех таблицах
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_brands ENABLE ROW LEVEL SECURITY;

-- 6. Удаляем существующие политики (если есть) и создаем новые
DROP POLICY IF EXISTS brands_tenant_policy ON brands;
DROP POLICY IF EXISTS location_brands_tenant_policy ON location_brands;

-- Политики для brands
CREATE POLICY brands_tenant_policy ON brands
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = brands.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = brands.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для location_brands
CREATE POLICY location_brands_tenant_policy ON location_brands
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM locations l
    JOIN tenants t ON t.id = l.tenant_id
    WHERE l.id = location_brands.location_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM locations l
    JOIN tenants t ON t.id = l.tenant_id
    WHERE l.id = location_brands.location_id
      AND t.owner_user_id = auth.uid()
  )
);

-- 7. Создаем безопасный VIEW для чтения связей
CREATE OR REPLACE VIEW v_location_brands AS
SELECT 
  l.id as location_id,
  l.name as location_name,
  l.address as location_address,
  l.tz as location_tz,
  l.status as location_status,
  b.id as brand_id,
  b.name as brand_name,
  b.slug as brand_slug,
  b.status as brand_status,
  lb.status as link_status,
  t.id as tenant_id,
  t.name as tenant_name
FROM location_brands lb
JOIN locations l ON l.id = lb.location_id
JOIN brands b ON b.id = lb.brand_id
JOIN tenants t ON t.id = l.tenant_id
WHERE lb.status = 'active'
  AND l.status = 'active'
  AND b.status = 'active';

-- RLS для VIEW
ALTER VIEW v_location_brands SET (security_invoker = true);

-- 8. Сид-данные для демонстрации
-- Создаем демо-tenant (если еще нет)
INSERT INTO tenants (id, owner_user_id, name, brand_name, currency, onboarding_completed)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  (SELECT id FROM auth.users LIMIT 1),
  'Demo Tenant',
  'Demo Brand',
  'EUR',
  true
) ON CONFLICT DO NOTHING;

-- Создаем бренды
INSERT INTO brands (id, tenant_id, name, slug, status)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Brand A', 'brand-a', 'active'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Brand B', 'brand-b', 'active')
ON CONFLICT DO NOTHING;

-- Создаем локации
INSERT INTO locations (id, tenant_id, name, address, tz, status)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Main Street', 
   '{"street": "Main Street 123", "city": "Moscow", "zip": "100000", "lat": 55.7558, "lon": 37.6176}', 
   'Europe/Moscow', 'active'),
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Downtown', 
   '{"street": "Downtown 456", "city": "Moscow", "zip": "100001", "lat": 55.7559, "lon": 37.6177}', 
   'Europe/Moscow', 'active')
ON CONFLICT DO NOTHING;

-- Создаем связи location_brands
INSERT INTO location_brands (location_id, brand_id, status)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'active'), -- Main Street + Brand A
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'active'), -- Main Street + Brand B
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'active')  -- Downtown + Brand A
ON CONFLICT DO NOTHING;
