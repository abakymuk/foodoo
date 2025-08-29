-- Модификаторы: группы и опции (+ привязка к item/variant, i18n, min/max, цены)
-- T-03. Модификаторы: группы и опции (+ привязка к item/variant, i18n, min/max, цены)

-- 1. Создаем таблицу modifier_groups
CREATE TABLE IF NOT EXISTS modifier_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  min INTEGER DEFAULT 0,
  max INTEGER DEFAULT 1,
  required BOOLEAN DEFAULT FALSE,
  exclusive BOOLEAN DEFAULT FALSE,
  display TEXT DEFAULT 'list' CHECK (display IN ('list', 'radio', 'quantity')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Уникальный индекс для code в рамках tenant
CREATE UNIQUE INDEX IF NOT EXISTS modifier_groups_unique_code ON modifier_groups(tenant_id, code);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS modifier_groups_tenant_idx ON modifier_groups(tenant_id);
CREATE INDEX IF NOT EXISTS modifier_groups_status_idx ON modifier_groups(status);

-- 2. Создаем таблицу modifier_group_i18n
CREATE TABLE IF NOT EXISTS modifier_group_i18n (
  group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, locale)
);

-- Индекс для производительности
CREATE INDEX IF NOT EXISTS modifier_group_i18n_locale_idx ON modifier_group_i18n(locale);

-- 3. Создаем таблицу modifiers
CREATE TABLE IF NOT EXISTS modifiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  price_delta NUMERIC(10,2) DEFAULT 0,
  default_qty INTEGER DEFAULT 0,
  max_qty INTEGER DEFAULT 1,
  inventory_link_id UUID NULL,
  sort INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Уникальный индекс для code в рамках группы
CREATE UNIQUE INDEX IF NOT EXISTS modifiers_unique_code ON modifiers(group_id, code);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS modifiers_group_idx ON modifiers(group_id);
CREATE INDEX IF NOT EXISTS modifiers_status_idx ON modifiers(status);
CREATE INDEX IF NOT EXISTS modifiers_sort_idx ON modifiers(sort);

-- 4. Создаем таблицу modifier_i18n
CREATE TABLE IF NOT EXISTS modifier_i18n (
  modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (modifier_id, locale)
);

-- Индекс для производительности
CREATE INDEX IF NOT EXISTS modifier_i18n_locale_idx ON modifier_i18n(locale);

-- 5. Создаем таблицу item_modifier_groups (привязка группы к item/variant + локальные оверрайды)
CREATE TABLE IF NOT EXISTS item_modifier_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES item_variants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 100,
  -- Оверрайды правил (опционально)
  min INTEGER NULL,
  max INTEGER NULL,
  required BOOLEAN NULL,
  exclusive BOOLEAN NULL,
  display TEXT NULL CHECK (display IN ('list', 'radio', 'quantity')),
  -- Дефолтная выборка
  default_selection_json JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS item_modifier_groups_tenant_idx ON item_modifier_groups(tenant_id);
CREATE INDEX IF NOT EXISTS item_modifier_groups_item_idx ON item_modifier_groups(item_id);
CREATE INDEX IF NOT EXISTS item_modifier_groups_variant_idx ON item_modifier_groups(variant_id);
CREATE INDEX IF NOT EXISTS item_modifier_groups_group_idx ON item_modifier_groups(group_id);
CREATE INDEX IF NOT EXISTS item_modifier_groups_sort_idx ON item_modifier_groups(sort);

-- 6. Включаем RLS на всех таблицах
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_group_i18n ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_i18n ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_modifier_groups ENABLE ROW LEVEL SECURITY;

-- 7. Удаляем существующие политики (если есть) и создаем новые
DROP POLICY IF EXISTS modifier_groups_tenant_policy ON modifier_groups;
DROP POLICY IF EXISTS modifier_group_i18n_tenant_policy ON modifier_group_i18n;
DROP POLICY IF EXISTS modifiers_tenant_policy ON modifiers;
DROP POLICY IF EXISTS modifier_i18n_tenant_policy ON modifier_i18n;
DROP POLICY IF EXISTS item_modifier_groups_tenant_policy ON item_modifier_groups;

-- Политики для modifier_groups
CREATE POLICY modifier_groups_tenant_policy ON modifier_groups
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = modifier_groups.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = modifier_groups.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для modifier_group_i18n
CREATE POLICY modifier_group_i18n_tenant_policy ON modifier_group_i18n
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM modifier_groups mg
    JOIN tenants t ON t.id = mg.tenant_id
    WHERE mg.id = modifier_group_i18n.group_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM modifier_groups mg
    JOIN tenants t ON t.id = mg.tenant_id
    WHERE mg.id = modifier_group_i18n.group_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для modifiers
CREATE POLICY modifiers_tenant_policy ON modifiers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM modifier_groups mg
    JOIN tenants t ON t.id = mg.tenant_id
    WHERE mg.id = modifiers.group_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM modifier_groups mg
    JOIN tenants t ON t.id = mg.tenant_id
    WHERE mg.id = modifiers.group_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для modifier_i18n
CREATE POLICY modifier_i18n_tenant_policy ON modifier_i18n
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM modifiers m
    JOIN modifier_groups mg ON mg.id = m.group_id
    JOIN tenants t ON t.id = mg.tenant_id
    WHERE m.id = modifier_i18n.modifier_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM modifiers m
    JOIN modifier_groups mg ON mg.id = m.group_id
    JOIN tenants t ON t.id = mg.tenant_id
    WHERE m.id = modifier_i18n.modifier_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для item_modifier_groups
CREATE POLICY item_modifier_groups_tenant_policy ON item_modifier_groups
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = item_modifier_groups.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = item_modifier_groups.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

-- 8. Создаем функции для валидации
CREATE OR REPLACE FUNCTION validate_modifier_group_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- min <= max
  IF NEW.min > NEW.max THEN
    RAISE EXCEPTION 'min cannot be greater than max';
  END IF;
  
  -- exclusive = true → max = 1
  IF NEW.exclusive = TRUE AND NEW.max != 1 THEN
    RAISE EXCEPTION 'exclusive groups must have max = 1';
  END IF;
  
  -- required = true → max >= 1
  IF NEW.required = TRUE AND NEW.max < 1 THEN
    RAISE EXCEPTION 'required groups must have max >= 1';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для валидации правил группы
DROP TRIGGER IF EXISTS validate_modifier_group_rules_trigger ON modifier_groups;
CREATE TRIGGER validate_modifier_group_rules_trigger
  BEFORE INSERT OR UPDATE ON modifier_groups
  FOR EACH ROW
  EXECUTE FUNCTION validate_modifier_group_rules();

-- Функция для валидации модификаторов
CREATE OR REPLACE FUNCTION validate_modifier_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- default_qty <= max_qty
  IF NEW.default_qty > NEW.max_qty THEN
    RAISE EXCEPTION 'default_qty cannot be greater than max_qty';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для валидации правил модификатора
DROP TRIGGER IF EXISTS validate_modifier_rules_trigger ON modifiers;
CREATE TRIGGER validate_modifier_rules_trigger
  BEFORE INSERT OR UPDATE ON modifiers
  FOR EACH ROW
  EXECUTE FUNCTION validate_modifier_rules();

-- Функция для валидации item_modifier_groups
CREATE OR REPLACE FUNCTION validate_item_modifier_group_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- хотя бы одно из item_id или variant_id не null
  IF NEW.item_id IS NULL AND NEW.variant_id IS NULL THEN
    RAISE EXCEPTION 'Either item_id or variant_id must be specified';
  END IF;
  
  -- Если указаны min/max/required/exclusive, они валидны по тем же правилам
  IF NEW.min IS NOT NULL AND NEW.max IS NOT NULL AND NEW.min > NEW.max THEN
    RAISE EXCEPTION 'min cannot be greater than max in override';
  END IF;
  
  IF NEW.exclusive = TRUE AND NEW.max IS NOT NULL AND NEW.max != 1 THEN
    RAISE EXCEPTION 'exclusive override must have max = 1';
  END IF;
  
  IF NEW.required = TRUE AND NEW.max IS NOT NULL AND NEW.max < 1 THEN
    RAISE EXCEPTION 'required override must have max >= 1';
  END IF;
  
  -- Проверяем, что variant принадлежит тому же tenant (только если есть auth.uid())
  IF NEW.variant_id IS NOT NULL AND auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM item_variants iv
      JOIN items i ON i.id = iv.item_id
      JOIN tenants t ON t.id = i.tenant_id
      WHERE iv.id = NEW.variant_id
        AND t.owner_user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Variant does not belong to current tenant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для валидации правил item_modifier_groups
DROP TRIGGER IF EXISTS validate_item_modifier_group_rules_trigger ON item_modifier_groups;
CREATE TRIGGER validate_item_modifier_group_rules_trigger
  BEFORE INSERT OR UPDATE ON item_modifier_groups
  FOR EACH ROW
  EXECUTE FUNCTION validate_item_modifier_group_rules();

-- 9. Сид-данные для демонстрации
DO $$
DECLARE
  demo_tenant_id UUID;
  demo_brand_id UUID;
  protein_group_id UUID;
  extras_group_id UUID;
  chicken_modifier_id UUID;
  beef_modifier_id UUID;
  tofu_modifier_id UUID;
  cheese_modifier_id UUID;
  bacon_modifier_id UUID;
  jalapeno_modifier_id UUID;
  chicken_bowl_item_id UUID;
  chicken_bowl_large_variant_id UUID;
BEGIN
  -- Получаем demo tenant и brand
  SELECT id INTO demo_tenant_id FROM tenants WHERE name = 'Demo Tenant' LIMIT 1;
  SELECT id INTO demo_brand_id FROM brands WHERE name = 'Brand A' AND tenant_id = demo_tenant_id LIMIT 1;
  
  -- Получаем Chicken Bowl item и его large вариант
  SELECT id INTO chicken_bowl_item_id FROM items WHERE base_sku = 'CHICKEN-BOWL' AND tenant_id = demo_tenant_id LIMIT 1;
  
  -- Проверяем, что item существует
  IF chicken_bowl_item_id IS NULL THEN
    RAISE NOTICE 'Chicken Bowl item not found, skipping variant modifier group creation';
  ELSE
    SELECT id INTO chicken_bowl_large_variant_id FROM item_variants WHERE variant_sku = 'CHICKEN-BOWL-LARGE' AND item_id = chicken_bowl_item_id LIMIT 1;
  END IF;
  
  -- Создаем группу protein
  INSERT INTO modifier_groups (id, tenant_id, code, status, min, max, required, exclusive, display)
  VALUES ('550e8400-e29b-41d4-a716-446655440020', demo_tenant_id, 'protein', 'active', 1, 1, TRUE, TRUE, 'radio')
  ON CONFLICT DO NOTHING
  RETURNING id INTO protein_group_id;
  
  -- Создаем i18n для группы protein
  INSERT INTO modifier_group_i18n (group_id, locale, title, description)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440020', 'en-US', 'Choose Protein', 'Select your protein option'),
    ('550e8400-e29b-41d4-a716-446655440020', 'ru-RU', 'Выберите белок', 'Выберите вариант белка')
  ON CONFLICT DO NOTHING;
  
  -- Создаем опции для protein
  INSERT INTO modifiers (id, group_id, code, status, price_delta, default_qty, max_qty, sort)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440020', 'chicken', 'active', 0.00, 1, 1, 100),
    ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440020', 'beef', 'active', 1.50, 0, 1, 200),
    ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440020', 'tofu', 'active', 0.50, 0, 1, 300)
  ON CONFLICT DO NOTHING;
  
  -- Создаем i18n для опций protein
  INSERT INTO modifier_i18n (modifier_id, locale, title, description)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440021', 'en-US', 'Chicken', 'Grilled chicken breast'),
    ('550e8400-e29b-41d4-a716-446655440021', 'ru-RU', 'Курица', 'Грудка курицы на гриле'),
    ('550e8400-e29b-41d4-a716-446655440022', 'en-US', 'Beef', 'Premium beef patty'),
    ('550e8400-e29b-41d4-a716-446655440022', 'ru-RU', 'Говядина', 'Премиальная говяжья котлета'),
    ('550e8400-e29b-41d4-a716-446655440023', 'en-US', 'Tofu', 'Marinated tofu'),
    ('550e8400-e29b-41d4-a716-446655440023', 'ru-RU', 'Тофу', 'Маринованное тофу')
  ON CONFLICT DO NOTHING;
  
  -- Создаем группу extras
  INSERT INTO modifier_groups (id, tenant_id, code, status, min, max, required, exclusive, display)
  VALUES ('550e8400-e29b-41d4-a716-446655440024', demo_tenant_id, 'extras', 'active', 0, 3, FALSE, FALSE, 'list')
  ON CONFLICT DO NOTHING
  RETURNING id INTO extras_group_id;
  
  -- Создаем i18n для группы extras
  INSERT INTO modifier_group_i18n (group_id, locale, title, description)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440024', 'en-US', 'Extra Toppings', 'Add extra toppings to your bowl'),
    ('550e8400-e29b-41d4-a716-446655440024', 'ru-RU', 'Дополнительные топпинги', 'Добавьте дополнительные топпинги в ваш боул')
  ON CONFLICT DO NOTHING;
  
  -- Создаем опции для extras
  INSERT INTO modifiers (id, group_id, code, status, price_delta, default_qty, max_qty, sort)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440024', 'cheese', 'active', 0.80, 0, 2, 100),
    ('550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440024', 'bacon', 'active', 1.20, 0, 1, 200),
    ('550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440024', 'jalapeno', 'active', 0.40, 0, 3, 300)
  ON CONFLICT DO NOTHING;
  
  -- Создаем i18n для опций extras
  INSERT INTO modifier_i18n (modifier_id, locale, title, description)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440025', 'en-US', 'Cheese', 'Shredded cheddar cheese'),
    ('550e8400-e29b-41d4-a716-446655440025', 'ru-RU', 'Сыр', 'Тертый сыр чеддер'),
    ('550e8400-e29b-41d4-a716-446655440026', 'en-US', 'Bacon', 'Crispy bacon bits'),
    ('550e8400-e29b-41d4-a716-446655440026', 'ru-RU', 'Бекон', 'Хрустящие кусочки бекона'),
    ('550e8400-e29b-41d4-a716-446655440027', 'en-US', 'Jalapeño', 'Spicy jalapeño peppers'),
    ('550e8400-e29b-41d4-a716-446655440027', 'ru-RU', 'Халапеньо', 'Острые перцы халапеньо')
  ON CONFLICT DO NOTHING;
  
  -- Привязываем группы к Chicken Bowl (item-level)
  INSERT INTO item_modifier_groups (id, tenant_id, item_id, group_id, sort, default_selection_json)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440028', demo_tenant_id, chicken_bowl_item_id, '550e8400-e29b-41d4-a716-446655440020', 100, '[{"modifier_id": "550e8400-e29b-41d4-a716-446655440021", "qty": 1}]'),
    ('550e8400-e29b-41d4-a716-446655440029', demo_tenant_id, chicken_bowl_item_id, '550e8400-e29b-41d4-a716-446655440024', 200, '[]')
  ON CONFLICT DO NOTHING;
  
  -- Привязываем extras к варианту large с оверрайдом max=4 (только если вариант существует)
  IF chicken_bowl_large_variant_id IS NOT NULL THEN
    INSERT INTO item_modifier_groups (id, tenant_id, variant_id, group_id, sort, max, default_selection_json)
    VALUES 
      ('550e8400-e29b-41d4-a716-446655440030', demo_tenant_id, chicken_bowl_large_variant_id, '550e8400-e29b-41d4-a716-446655440024', 200, 4, '[]')
    ON CONFLICT DO NOTHING;
  ELSE
    RAISE NOTICE 'Chicken Bowl large variant not found, skipping variant modifier group creation';
  END IF;
  
END $$;
