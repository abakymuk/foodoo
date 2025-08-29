-- Тестовый скрипт для проверки каталога меню
-- T-02. Каталог: категории → позиции → варианты (+ i18n и медиа)

-- 1. Проверяем существование таблиц
SELECT
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅' ELSE '❌' END as exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('categories', 'category_i18n', 'items', 'item_i18n', 'item_media', 'item_variants', 'category_items')
ORDER BY table_name;

-- 2. Проверяем структуру таблицы categories
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'categories'
ORDER BY ordinal_position;

-- 3. Проверяем структуру таблицы items
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'items'
ORDER BY ordinal_position;

-- 4. Проверяем CHECK ограничения
SELECT
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('categories', 'items', 'item_media', 'item_variants')
ORDER BY tc.table_name, cc.constraint_name;

-- 5. Проверяем индексы
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('categories', 'category_i18n', 'items', 'item_i18n', 'item_media', 'item_variants', 'category_items')
ORDER BY tablename, indexname;

-- 6. Проверяем RLS
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('categories', 'category_i18n', 'items', 'item_i18n', 'item_media', 'item_variants', 'category_items')
ORDER BY tablename;

-- 7. Проверяем политики RLS
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
  AND tablename IN ('categories', 'category_i18n', 'items', 'item_i18n', 'item_media', 'item_variants', 'category_items')
ORDER BY tablename, policyname;

-- 8. Проверяем уникальность code в рамках tenant/brand
SELECT
  tenant_id,
  COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::UUID) as brand_id,
  code,
  COUNT(*) as count
FROM categories
GROUP BY tenant_id, COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::UUID), code
HAVING COUNT(*) > 1;

-- 9. Проверяем уникальность base_sku в рамках tenant
SELECT
  tenant_id,
  base_sku,
  COUNT(*) as count
FROM items
GROUP BY tenant_id, base_sku
HAVING COUNT(*) > 1;

-- 10. Проверяем уникальность variant_sku в рамках item
SELECT
  item_id,
  variant_sku,
  COUNT(*) as count
FROM item_variants
GROUP BY item_id, variant_sku
HAVING COUNT(*) > 1;

-- 11. Проверяем частичный уникальный индекс для is_default
SELECT
  item_id,
  COUNT(*) as default_count
FROM item_variants
WHERE is_default = TRUE
GROUP BY item_id
HAVING COUNT(*) > 1;

-- 12. Проверяем сид-данные (требует аутентификации)
-- Этот запрос нужно выполнять в контексте аутентифицированного пользователя
/*
SELECT
  c.code as category_code,
  ci18n.title as category_title,
  i.base_sku as item_sku,
  ii18n.title as item_title,
  i.product_type,
  COUNT(iv.id) as variants_count,
  COUNT(im.id) as media_count
FROM categories c
LEFT JOIN category_i18n ci18n ON c.id = ci18n.category_id AND ci18n.locale = 'en-US'
LEFT JOIN category_items ci ON c.id = ci.category_id
LEFT JOIN items i ON ci.item_id = i.id
LEFT JOIN item_i18n ii18n ON i.id = ii18n.item_id AND ii18n.locale = 'en-US'
LEFT JOIN item_variants iv ON i.id = iv.item_id
LEFT JOIN item_media im ON i.id = im.item_id
GROUP BY c.id, c.code, ci18n.title, i.id, i.base_sku, ii18n.title, i.product_type
ORDER BY c.sort, ci.sort;
*/

-- 13. Проверяем каскадные удаления (тест на демо-БД)
-- ВНИМАНИЕ: Этот тест удалит данные!
/*
-- Создаем тестовые данные
INSERT INTO tenants (id, owner_user_id, name, brand_name, currency, onboarding_completed)
VALUES ('test-catalog-tenant', 'test-user-id', 'Test Catalog Tenant', 'Test Brand', 'EUR', true);

INSERT INTO categories (id, tenant_id, code, sort, status)
VALUES ('test-category-id', 'test-catalog-tenant', 'test-category', 100, 'active');

INSERT INTO items (id, tenant_id, base_sku, product_type, status)
VALUES ('test-item-id', 'test-catalog-tenant', 'TEST-ITEM', 'simple', 'active');

INSERT INTO category_items (category_id, item_id, sort)
VALUES ('test-category-id', 'test-item-id', 100);

-- Проверяем, что данные созданы
SELECT COUNT(*) as categories_count FROM categories WHERE tenant_id = 'test-catalog-tenant';
SELECT COUNT(*) as items_count FROM items WHERE tenant_id = 'test-catalog-tenant';
SELECT COUNT(*) as links_count FROM category_items WHERE category_id = 'test-category-id';

-- Удаляем tenant и проверяем каскад
DELETE FROM tenants WHERE id = 'test-catalog-tenant';

-- Проверяем, что все связанные данные удалены
SELECT COUNT(*) as categories_count FROM categories WHERE tenant_id = 'test-catalog-tenant';
SELECT COUNT(*) as items_count FROM items WHERE tenant_id = 'test-catalog-tenant';
SELECT COUNT(*) as links_count FROM category_items WHERE category_id = 'test-category-id';
*/

-- 14. Проверяем функцию проверки целостности category_items
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'check_category_item_tenant_consistency';

-- 15. Проверяем триггер
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'category_items'
  AND trigger_name = 'category_items_tenant_check';
