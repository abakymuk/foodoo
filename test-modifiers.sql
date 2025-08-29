-- Тестовый скрипт для проверки миграции модификаторов
-- T-03. Модификаторы: группы и опции (+ привязка к item/variant, i18n, min/max, цены)

-- 1. Проверяем создание таблиц
SELECT 'modifier_groups' as table_name, 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modifier_groups') as exists
UNION ALL
SELECT 'modifier_group_i18n' as table_name, 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modifier_group_i18n') as exists
UNION ALL
SELECT 'modifiers' as table_name, 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modifiers') as exists
UNION ALL
SELECT 'modifier_i18n' as table_name, 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modifier_i18n') as exists
UNION ALL
SELECT 'item_modifier_groups' as table_name, 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'item_modifier_groups') as exists;

-- 2. Проверяем структуру таблицы modifier_groups
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'modifier_groups' 
ORDER BY ordinal_position;

-- 3. Проверяем CHECK constraints для modifier_groups
SELECT conname as constraint_name, 
       pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'modifier_groups')
  AND contype = 'c';

-- 4. Проверяем индексы для modifier_groups
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'modifier_groups';

-- 5. Проверяем структуру таблицы modifiers
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'modifiers' 
ORDER BY ordinal_position;

-- 6. Проверяем CHECK constraints для modifiers
SELECT conname as constraint_name, 
       pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'modifiers')
  AND contype = 'c';

-- 7. Проверяем индексы для modifiers
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'modifiers';

-- 8. Проверяем структуру таблицы item_modifier_groups
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'item_modifier_groups' 
ORDER BY ordinal_position;

-- 9. Проверяем CHECK constraints для item_modifier_groups
SELECT conname as constraint_name, 
       pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'item_modifier_groups')
  AND contype = 'c';

-- 10. Проверяем индексы для item_modifier_groups
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'item_modifier_groups';

-- 11. Проверяем RLS статус
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename IN ('modifier_groups', 'modifier_group_i18n', 'modifiers', 'modifier_i18n', 'item_modifier_groups');

-- 12. Проверяем RLS политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('modifier_groups', 'modifier_group_i18n', 'modifiers', 'modifier_i18n', 'item_modifier_groups')
ORDER BY tablename, policyname;

-- 13. Проверяем уникальные ограничения
SELECT conname as constraint_name, 
       pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE contype = 'u' 
  AND conrelid IN (
    (SELECT oid FROM pg_class WHERE relname = 'modifier_groups'),
    (SELECT oid FROM pg_class WHERE relname = 'modifier_group_i18n'),
    (SELECT oid FROM pg_class WHERE relname = 'modifiers'),
    (SELECT oid FROM pg_class WHERE relname = 'modifier_i18n'),
    (SELECT oid FROM pg_class WHERE relname = 'item_modifier_groups')
  );

-- 14. Проверяем функции валидации
SELECT proname as function_name, 
       pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname IN ('validate_modifier_group_rules', 'validate_modifier_rules', 'validate_item_modifier_group_rules');

-- 15. Проверяем триггеры
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('modifier_groups', 'modifiers', 'item_modifier_groups')
ORDER BY event_object_table, trigger_name;

-- 16. Проверяем foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('modifier_groups', 'modifier_group_i18n', 'modifiers', 'modifier_i18n', 'item_modifier_groups')
ORDER BY tc.table_name, kcu.column_name;

-- 17. Проверяем сид-данные (если есть)
-- Раскомментировать для проверки сид-данных:

/*
-- Проверяем группы модификаторов
SELECT mg.id, mg.code, mg.status, mg.min, mg.max, mg.required, mg.exclusive, mg.display,
       mgi.locale, mgi.title, mgi.description
FROM modifier_groups mg
LEFT JOIN modifier_group_i18n mgi ON mg.id = mgi.group_id
ORDER BY mg.code, mgi.locale;

-- Проверяем модификаторы
SELECT m.id, m.code, m.status, m.price_delta, m.default_qty, m.max_qty, m.sort,
       mg.code as group_code,
       mi.locale, mi.title, mi.description
FROM modifiers m
JOIN modifier_groups mg ON m.group_id = mg.id
LEFT JOIN modifier_i18n mi ON m.id = mi.modifier_id
ORDER BY mg.code, m.code, mi.locale;

-- Проверяем привязки к позициям
SELECT img.id, img.sort, img.min, img.max, img.required, img.exclusive, img.display,
       mg.code as group_code,
       i.base_sku as item_sku,
       iv.variant_sku,
       img.default_selection_json
FROM item_modifier_groups img
JOIN modifier_groups mg ON img.group_id = mg.id
LEFT JOIN items i ON img.item_id = i.id
LEFT JOIN item_variants iv ON img.variant_id = iv.id
ORDER BY COALESCE(i.base_sku, iv.variant_sku), img.sort;
*/

-- 18. Проверяем каскадные удаления (тест)
-- Раскомментировать для тестирования каскадных удалений:

/*
-- Создаем тестовые данные для проверки каскадных удалений
DO $$
DECLARE
  test_tenant_id UUID := gen_random_uuid();
  test_group_id UUID := gen_random_uuid();
  test_modifier_id UUID := gen_random_uuid();
  test_item_id UUID := gen_random_uuid();
BEGIN
  -- Создаем тестовый tenant
  INSERT INTO tenants (id, owner_user_id, name, currency) 
  VALUES (test_tenant_id, 'test-user-id', 'Test Tenant', 'USD');
  
  -- Создаем тестовую группу
  INSERT INTO modifier_groups (id, tenant_id, code, status) 
  VALUES (test_group_id, test_tenant_id, 'test-group', 'active');
  
  -- Создаем тестовый модификатор
  INSERT INTO modifiers (id, group_id, code, status) 
  VALUES (test_modifier_id, test_group_id, 'test-modifier', 'active');
  
  -- Создаем тестовый item
  INSERT INTO items (id, tenant_id, base_sku, product_type, status) 
  VALUES (test_item_id, test_tenant_id, 'TEST-ITEM', 'simple', 'active');
  
  -- Создаем тестовую привязку
  INSERT INTO item_modifier_groups (id, tenant_id, item_id, group_id) 
  VALUES (gen_random_uuid(), test_tenant_id, test_item_id, test_group_id);
  
  -- Проверяем, что данные созданы
  RAISE NOTICE 'Test data created: tenant=%, group=%, modifier=%, item=%, binding=%', 
    test_tenant_id, test_group_id, test_modifier_id, test_item_id, 
    (SELECT id FROM item_modifier_groups WHERE item_id = test_item_id AND group_id = test_group_id);
  
  -- Удаляем группу и проверяем каскадное удаление
  DELETE FROM modifier_groups WHERE id = test_group_id;
  
  -- Проверяем, что модификатор и привязка удалены
  IF EXISTS (SELECT 1 FROM modifiers WHERE id = test_modifier_id) THEN
    RAISE EXCEPTION 'Modifier was not deleted by cascade';
  END IF;
  
  IF EXISTS (SELECT 1 FROM item_modifier_groups WHERE item_id = test_item_id AND group_id = test_group_id) THEN
    RAISE EXCEPTION 'Item modifier group was not deleted by cascade';
  END IF;
  
  -- Очищаем тестовые данные
  DELETE FROM items WHERE id = test_item_id;
  DELETE FROM tenants WHERE id = test_tenant_id;
  
  RAISE NOTICE 'Cascade delete test passed successfully';
END $$;
*/
