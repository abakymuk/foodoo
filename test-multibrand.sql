-- Тестовый скрипт для проверки мультибрендовой модели
-- T-01. База мультибрендов: tenants → brands → locations (+ привязки)

-- 1. Проверяем существование таблиц
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅' ELSE '❌' END as exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tenants', 'brands', 'locations', 'location_brands')
ORDER BY table_name;

-- 2. Проверяем структуру таблицы brands
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'brands'
ORDER BY ordinal_position;

-- 3. Проверяем CHECK ограничения
SELECT 
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('brands', 'locations', 'location_brands')
ORDER BY tc.table_name, cc.constraint_name;

-- 4. Проверяем индексы
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('brands', 'locations', 'location_brands')
ORDER BY tablename, indexname;

-- 5. Проверяем RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('tenants', 'brands', 'locations', 'location_brands')
ORDER BY tablename;

-- 6. Проверяем политики RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('brands', 'locations', 'location_brands')
ORDER BY tablename, policyname;

-- 7. Проверяем VIEW
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'v_location_brands';

-- 8. Проверяем сид-данные (требует аутентификации)
-- Этот запрос нужно выполнять в контексте аутентифицированного пользователя
/*
SELECT 
  l.name as location, 
  b.name as brand, 
  lb.status
FROM location_brands lb
JOIN locations l ON l.id = lb.location_id
JOIN brands b ON b.id = lb.brand_id
ORDER BY l.name, b.name;
*/

-- 9. Проверяем уникальность slug в рамках tenant
SELECT 
  tenant_id,
  slug,
  COUNT(*) as count
FROM brands 
GROUP BY tenant_id, slug 
HAVING COUNT(*) > 1;

-- 10. Проверяем каскадные удаления (тест на демо-БД)
-- ВНИМАНИЕ: Этот тест удалит данные!
/*
-- Создаем тестовые данные
INSERT INTO tenants (id, owner_user_id, name, brand_name, currency, onboarding_completed)
VALUES ('test-tenant-id', 'test-user-id', 'Test Tenant', 'Test Brand', 'EUR', true);

INSERT INTO brands (id, tenant_id, name, slug, status)
VALUES ('test-brand-id', 'test-tenant-id', 'Test Brand', 'test-brand', 'active');

INSERT INTO locations (id, tenant_id, name, status)
VALUES ('test-location-id', 'test-tenant-id', 'Test Location', 'active');

INSERT INTO location_brands (location_id, brand_id, status)
VALUES ('test-location-id', 'test-brand-id', 'active');

-- Проверяем, что данные созданы
SELECT COUNT(*) as brands_count FROM brands WHERE tenant_id = 'test-tenant-id';
SELECT COUNT(*) as locations_count FROM locations WHERE tenant_id = 'test-tenant-id';
SELECT COUNT(*) as links_count FROM location_brands WHERE location_id = 'test-location-id';

-- Удаляем tenant и проверяем каскад
DELETE FROM tenants WHERE id = 'test-tenant-id';

-- Проверяем, что все связанные данные удалены
SELECT COUNT(*) as brands_count FROM brands WHERE tenant_id = 'test-tenant-id';
SELECT COUNT(*) as locations_count FROM locations WHERE tenant_id = 'test-tenant-id';
SELECT COUNT(*) as links_count FROM location_brands WHERE location_id = 'test-location-id';
*/
