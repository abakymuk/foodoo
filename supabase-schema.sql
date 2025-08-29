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

-- Создание таблицы orders (расширенная версия)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number BIGSERIAL,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','in_progress','en_route','completed','canceled','paid_test')),
  total_cents INT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  items_total_cents INT DEFAULT 0 CHECK (items_total_cents >= 0),
  tax_cents INT DEFAULT 0 CHECK (tax_cents >= 0),
  service_fee_cents INT DEFAULT 0 CHECK (service_fee_cents >= 0),
  delivery_fee_cents INT DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  discount_cents INT DEFAULT 0 CHECK (discount_cents >= 0),
  is_test BOOLEAN NOT NULL DEFAULT TRUE,
  order_type TEXT NOT NULL DEFAULT 'pickup' CHECK (order_type IN ('pickup','delivery')),
  payment_method TEXT NOT NULL DEFAULT 'card' CHECK (payment_method IN ('card','cash','other')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  expected_at TIMESTAMPTZ,
  channel TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_comment TEXT,
  delivery_address JSONB,
  assignee_user_id UUID REFERENCES auth.users(id),
  courier_name TEXT,
  courier_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Уникальный индекс для order_number
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key ON public.orders(order_number);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS orders_tenant_created_idx ON public.orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_tenant_status_idx ON public.orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS orders_expected_idx ON public.orders(tenant_id, expected_at);

-- Создание таблицы order_items (расширенная версия)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.menu_items(id),
  item_name TEXT NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price_cents INT NOT NULL CHECK (unit_price_cents >= 0),
  modifiers JSONB,
  subtotal_cents INT NOT NULL CHECK (subtotal_cents >= 0)
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);

-- Создание таблицы payments (расширенная версия)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  amount_cents INT NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL CHECK (status IN ('unpaid','paid','refunded')),
  is_test BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payments_tenant_order_idx ON public.payments(tenant_id, order_id);

-- Включаем RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики (если есть) и создаем новые
DROP POLICY IF EXISTS owner_select ON public.tenants;
DROP POLICY IF EXISTS owner_modify ON public.tenants;
DROP POLICY IF EXISTS child_select_locations ON public.locations;
DROP POLICY IF EXISTS child_modify_locations ON public.locations;
DROP POLICY IF EXISTS child_select_menu_items ON public.menu_items;
DROP POLICY IF EXISTS child_modify_menu_items ON public.menu_items;
DROP POLICY IF EXISTS child_select_orders ON public.orders;
DROP POLICY IF EXISTS child_modify_orders ON public.orders;
DROP POLICY IF EXISTS child_select_order_items ON public.order_items;
DROP POLICY IF EXISTS child_modify_order_items ON public.order_items;
DROP POLICY IF EXISTS child_select_payments ON public.payments;
DROP POLICY IF EXISTS child_modify_payments ON public.payments;

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

CREATE POLICY child_select_order_items ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = order_items.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

CREATE POLICY child_modify_order_items ON public.order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = order_items.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = order_items.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

CREATE POLICY child_select_payments ON public.payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = payments.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

CREATE POLICY child_modify_payments ON public.payments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = payments.tenant_id
      AND t.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = payments.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);
