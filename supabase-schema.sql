-- Создание таблицы tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  brand_name TEXT, -- Corrected column name
  currency TEXT DEFAULT 'EUR', -- Added currency to tenants
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_tenants_owner_user_id ON tenants(owner_user_id);

-- Создание таблицы locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL
  -- Removed currency and is_active as per user's schema
);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);

-- Создание таблицы menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant_id ON public.menu_items(tenant_id);

-- Создание таблицы orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('created','paid_test')),
  total_cents INT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  is_test BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON public.orders(tenant_id);

-- Включаем RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики (если есть) и создаем новые
DROP POLICY IF EXISTS owner_select ON public.tenants;
DROP POLICY IF EXISTS owner_modify ON public.tenants;
DROP POLICY IF EXISTS child_select_locations ON public.locations;
DROP POLICY IF EXISTS child_modify_locations ON public.locations;
DROP POLICY IF EXISTS child_select_menu_items ON public.menu_items;
DROP POLICY IF EXISTS child_modify_menu_items ON public.menu_items;
DROP POLICY IF EXISTS child_select_orders ON public.orders;
DROP POLICY IF EXISTS child_modify_orders ON public.orders;

-- Политики: владелец видит своё
CREATE POLICY owner_select ON public.tenants
FOR SELECT USING ( owner_user_id = auth.uid() );

CREATE POLICY owner_modify ON public.tenants
FOR ALL USING ( owner_user_id = auth.uid() )
WITH CHECK ( owner_user_id = auth.uid() );

-- Дочерние таблицы: проверка по принадлежности к tenant владельца
CREATE POLICY child_select_locations ON public.locations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = locations.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

CREATE POLICY child_modify_locations ON public.locations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = locations.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = locations.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

CREATE POLICY child_select_menu_items ON public.menu_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = menu_items.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

CREATE POLICY child_modify_menu_items ON public.menu_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = menu_items.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = menu_items.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

CREATE POLICY child_select_orders ON public.orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = orders.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

CREATE POLICY child_modify_orders ON public.orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = orders.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = orders.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);
