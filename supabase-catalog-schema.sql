-- Каталог меню: категории → позиции → варианты (+ i18n и медиа)
-- T-02. Каталог: категории → позиции → варианты (+ i18n и медиа)

-- 1. Создаем таблицу categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  sort INTEGER DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Уникальный индекс для code в рамках tenant/brand
CREATE UNIQUE INDEX IF NOT EXISTS categories_unique_code ON categories(
  tenant_id, 
  COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::UUID), 
  code
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS categories_tenant_idx ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS categories_brand_idx ON categories(brand_id);
CREATE INDEX IF NOT EXISTS categories_status_idx ON categories(status);

-- 2. Создаем таблицу category_i18n
CREATE TABLE IF NOT EXISTS category_i18n (
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (category_id, locale)
);

-- Индекс для производительности
CREATE INDEX IF NOT EXISTS category_i18n_locale_idx ON category_i18n(locale);

-- 3. Создаем таблицу items
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  base_sku TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('simple', 'variant')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  allergen_mask INTEGER DEFAULT 0,
  kds_station TEXT,
  print_profile TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Уникальный индекс для base_sku в рамках tenant
CREATE UNIQUE INDEX IF NOT EXISTS items_unique_sku ON items(tenant_id, base_sku);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS items_tenant_idx ON items(tenant_id);
CREATE INDEX IF NOT EXISTS items_status_idx ON items(status);
CREATE INDEX IF NOT EXISTS items_product_type_idx ON items(product_type);

-- 4. Создаем таблицу item_i18n
CREATE TABLE IF NOT EXISTS item_i18n (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  seo_meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (item_id, locale)
);

-- Индекс для производительности
CREATE INDEX IF NOT EXISTS item_i18n_locale_idx ON item_i18n(locale);

-- 5. Создаем таблицу item_media
CREATE TABLE IF NOT EXISTS item_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('primary', 'gallery', 'icon')),
  url TEXT NOT NULL,
  alt TEXT,
  aspect_ratio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS item_media_item_idx ON item_media(item_id);
CREATE INDEX IF NOT EXISTS item_media_kind_idx ON item_media(kind);

-- 6. Создаем таблицу item_variants
CREATE TABLE IF NOT EXISTS item_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_sku TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  size TEXT,
  weight NUMERIC,
  volume NUMERIC,
  barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Уникальный индекс для variant_sku в рамках item
CREATE UNIQUE INDEX IF NOT EXISTS item_variants_unique_sku ON item_variants(item_id, variant_sku);

-- Частичный уникальный индекс для is_default (максимум один дефолт на item)
CREATE UNIQUE INDEX IF NOT EXISTS item_variants_default_idx ON item_variants(item_id) WHERE is_default = TRUE;

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS item_variants_item_idx ON item_variants(item_id);

-- 7. Создаем таблицу category_items (связка MANY-to-MANY)
CREATE TABLE IF NOT EXISTS category_items (
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (category_id, item_id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS category_items_category_idx ON category_items(category_id);
CREATE INDEX IF NOT EXISTS category_items_item_idx ON category_items(item_id);
CREATE INDEX IF NOT EXISTS category_items_sort_idx ON category_items(sort);

-- 8. Включаем RLS на всех таблицах
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_i18n ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_i18n ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_items ENABLE ROW LEVEL SECURITY;

-- 9. Удаляем существующие политики (если есть) и создаем новые
DROP POLICY IF EXISTS categories_tenant_policy ON categories;
DROP POLICY IF EXISTS category_i18n_tenant_policy ON category_i18n;
DROP POLICY IF EXISTS items_tenant_policy ON items;
DROP POLICY IF EXISTS item_i18n_tenant_policy ON item_i18n;
DROP POLICY IF EXISTS item_media_tenant_policy ON item_media;
DROP POLICY IF EXISTS item_variants_tenant_policy ON item_variants;
DROP POLICY IF EXISTS category_items_tenant_policy ON category_items;

-- Политики для categories
CREATE POLICY categories_tenant_policy ON categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = categories.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = categories.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для category_i18n
CREATE POLICY category_i18n_tenant_policy ON category_i18n
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE c.id = category_i18n.category_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE c.id = category_i18n.category_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для items
CREATE POLICY items_tenant_policy ON items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = items.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = items.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для item_i18n
CREATE POLICY item_i18n_tenant_policy ON item_i18n
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM items i
    JOIN tenants t ON t.id = i.tenant_id
    WHERE i.id = item_i18n.item_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM items i
    JOIN tenants t ON t.id = i.tenant_id
    WHERE i.id = item_i18n.item_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для item_media
CREATE POLICY item_media_tenant_policy ON item_media
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM items i
    JOIN tenants t ON t.id = i.tenant_id
    WHERE i.id = item_media.item_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM items i
    JOIN tenants t ON t.id = i.tenant_id
    WHERE i.id = item_media.item_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для item_variants
CREATE POLICY item_variants_tenant_policy ON item_variants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM items i
    JOIN tenants t ON t.id = i.tenant_id
    WHERE i.id = item_variants.item_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM items i
    JOIN tenants t ON t.id = i.tenant_id
    WHERE i.id = item_variants.item_id
      AND t.owner_user_id = auth.uid()
  )
);

-- Политики для category_items
CREATE POLICY category_items_tenant_policy ON category_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE c.id = category_items.category_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE c.id = category_items.category_id
      AND t.owner_user_id = auth.uid()
  )
);

-- 10. Создаем функцию для проверки целостности category_items
CREATE OR REPLACE FUNCTION check_category_item_tenant_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем, что item и category принадлежат одному tenant
  IF NOT EXISTS (
    SELECT 1 
    FROM categories c
    JOIN items i ON i.tenant_id = c.tenant_id
    WHERE c.id = NEW.category_id AND i.id = NEW.item_id
  ) THEN
    RAISE EXCEPTION 'Item and category must belong to the same tenant';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для проверки целостности
DROP TRIGGER IF EXISTS category_items_tenant_check ON category_items;
CREATE TRIGGER category_items_tenant_check
  BEFORE INSERT OR UPDATE ON category_items
  FOR EACH ROW
  EXECUTE FUNCTION check_category_item_tenant_consistency();

-- 11. Сид-данные для демонстрации
-- Получаем существующий tenant и brand
DO $$
DECLARE
  demo_tenant_id UUID;
  demo_brand_id UUID;
BEGIN
  -- Получаем demo tenant
  SELECT id INTO demo_tenant_id FROM tenants WHERE name = 'Demo Tenant' LIMIT 1;
  
  -- Получаем demo brand
  SELECT id INTO demo_brand_id FROM brands WHERE name = 'Brand A' AND tenant_id = demo_tenant_id LIMIT 1;
  
  -- Создаем категории
  INSERT INTO categories (id, tenant_id, brand_id, code, sort, status)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440010', demo_tenant_id, demo_brand_id, 'burgers', 100, 'active'),
    ('550e8400-e29b-41d4-a716-446655440011', demo_tenant_id, demo_brand_id, 'bowls', 200, 'active')
  ON CONFLICT DO NOTHING;
  
  -- Создаем i18n для категорий
  INSERT INTO category_i18n (category_id, locale, title, description)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440010', 'en-US', 'Burgers', 'Delicious burgers'),
    ('550e8400-e29b-41d4-a716-446655440010', 'ru-RU', 'Бургеры', 'Вкусные бургеры'),
    ('550e8400-e29b-41d4-a716-446655440011', 'en-US', 'Bowls', 'Healthy bowls'),
    ('550e8400-e29b-41d4-a716-446655440011', 'ru-RU', 'Боулы', 'Полезные боулы')
  ON CONFLICT DO NOTHING;
  
  -- Создаем позиции
  INSERT INTO items (id, tenant_id, base_sku, product_type, status)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440012', demo_tenant_id, 'CHICKEN-BOWL', 'variant', 'active'),
    ('550e8400-e29b-41d4-a716-446655440013', demo_tenant_id, 'BEEF-BURGER', 'simple', 'active')
  ON CONFLICT DO NOTHING;
  
  -- Создаем i18n для позиций
  INSERT INTO item_i18n (item_id, locale, title, description)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440012', 'en-US', 'Chicken Bowl', 'Delicious chicken bowl'),
    ('550e8400-e29b-41d4-a716-446655440012', 'ru-RU', 'Куриный боул', 'Вкусный куриный боул'),
    ('550e8400-e29b-41d4-a716-446655440013', 'en-US', 'Beef Burger', 'Classic beef burger'),
    ('550e8400-e29b-41d4-a716-446655440013', 'ru-RU', 'Говяжий бургер', 'Классический говяжий бургер')
  ON CONFLICT DO NOTHING;
  
  -- Создаем варианты для Chicken Bowl
  INSERT INTO item_variants (id, item_id, variant_sku, is_default, size)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440012', 'CHICKEN-BOWL-SMALL', TRUE, 'small'),
    ('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440012', 'CHICKEN-BOWL-LARGE', FALSE, 'large')
  ON CONFLICT DO NOTHING;
  
  -- Создаем медиа для позиций
  INSERT INTO item_media (id, item_id, kind, url, alt, aspect_ratio)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440012', 'primary', 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Chicken+Bowl', 'Chicken Bowl', '4:3'),
    ('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440013', 'primary', 'https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Beef+Burger', 'Beef Burger', '4:3')
  ON CONFLICT DO NOTHING;
  
  -- Создаем связи category_items
  INSERT INTO category_items (category_id, item_id, sort)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440012', 100), -- Chicken Bowl в Bowls
    ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440013', 100)  -- Beef Burger в Burgers
  ON CONFLICT DO NOTHING;
  
END $$;
