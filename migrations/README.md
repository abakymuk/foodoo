# Миграции мультибрендовой модели

## T-01. База мультибрендов: tenants → brands → locations (+ привязки)

### Схема

```
tenants (арендаторы)
├── brands (бренды)
│   ├── name: TEXT NOT NULL
│   ├── slug: TEXT NOT NULL (уникален в рамках tenant)
│   └── status: TEXT DEFAULT 'active' CHECK (status IN ('active','inactive'))
├── locations (точки)
│   ├── name: TEXT NOT NULL
│   ├── address: JSONB (город, широта/долгота)
│   ├── tz: TEXT CHECK (tz ~ '^[A-Za-z_]+/[A-Za-z_]+')
│   └── status: TEXT DEFAULT 'active' CHECK (status IN ('active','inactive'))
└── location_brands (связи many-to-many)
    ├── location_id: UUID FK → locations(id) ON DELETE CASCADE
    ├── brand_id: UUID FK → brands(id) ON DELETE CASCADE
    ├── status: TEXT DEFAULT 'active' CHECK (status IN ('active','inactive'))
    └── PRIMARY KEY (location_id, brand_id)
```

### Связи

- **tenants** → **brands**: `tenant_id` FK с каскадным удалением
- **tenants** → **locations**: `tenant_id` FK с каскадным удалением  
- **locations** ↔ **brands**: через таблицу `location_brands` с каскадным удалением

### Индексы

- `brands_unique_slug`: UNIQUE (tenant_id, slug)
- `brands_tenant_idx`: (tenant_id)
- `locations_tenant_idx`: (tenant_id)
- `location_brands_loc_idx`: (location_id)
- `location_brands_brand_idx`: (brand_id)

### RLS (Row Level Security)

Все таблицы имеют включенный RLS с политиками:
- **brands**: проверка `tenant_id` через связь с `tenants.owner_user_id = auth.uid()`
- **locations**: проверка `tenant_id` через связь с `tenants.owner_user_id = auth.uid()`
- **location_brands**: проверка через связь `locations → tenants.owner_user_id = auth.uid()`

### VIEW

`v_location_brands` - безопасный VIEW для чтения связей локаций и брендов с RLS.

### Как проверить

1. **Применить миграцию:**
   ```sql
   \i supabase-multibrand-schema.sql
   ```

2. **Проверить структуру:**
   ```sql
   \i test-multibrand.sql
   ```

3. **Проверить изоляцию данных:**
   ```sql
   -- В контексте аутентифицированного пользователя
   SELECT l.name as location, b.name as brand, lb.status
   FROM location_brands lb
   JOIN locations l ON l.id = lb.location_id
   JOIN brands b ON b.id = lb.brand_id
   ORDER BY l.name, b.name;
   ```

4. **Проверить каскадные удаления:**
   ```sql
   -- Создать тестовые данные и удалить tenant
   -- Убедиться, что все связанные записи удалены каскадом
   ```

### Сид-данные

Миграция создает демо-данные:
- 1 tenant: "Demo Tenant"
- 2 brands: "Brand A", "Brand B"  
- 2 locations: "Main Street", "Downtown"
- Связи: Main Street → оба бренда, Downtown → только Brand A

### Использование в коде

```typescript
import { getBrands, createBrand } from "@/app/app/actions/brands";
import { getLocations, attachBrandToLocation } from "@/app/app/actions/locations";

// Получить бренды текущего tenant
const { data: brands } = await getBrands();

// Создать новый бренд
const { data: brand } = await createBrand({
  name: "New Brand",
  slug: "new-brand"
});

// Привязать бренд к локации
await attachBrandToLocation({
  brand_id: brand.id,
  location_id: location.id
});
```
