T-01. База мультибрендов: tenants → brands → locations (+ привязки)

Цель: заложить фундамент мультибрендовой модели: один арендатор (tenant), его бренды и точки (locations), с явной связью какие бренды активны в какой локации.

Зачем: все остальное (категории, позиции, цены, публикации) будет ссылаться на эти ключи. Если тут порядок, остальной каталог не «поедет».

⸻

Что сделать (простыми шагами)
	1.	Создай таблицы (миграции Drizzle для Supabase/Postgres)
	•	tenants (id uuid pk, name text not null, created_at timestamptz default now())
	•	brands (id uuid pk, tenant_id fk→tenants, name text, slug text unique within tenant, status text default 'active')
	•	locations (id uuid pk, tenant_id fk→tenants, name text, address jsonb, tz text, status text default 'active')
	•	location_brands (location_id fk, brand_id fk, status text default 'active', primary key (location_id, brand_id))
	•	Индексы:
	•	brands_unique_slug: unique (tenant_id, slug)
	•	locations_tenant_idx: (tenant_id)
	•	location_brands_loc_idx: (location_id), location_brands_brand_idx: (brand_id)
	2.	Введи обязательные ограничения и каскады
	•	Везде on delete cascade на связи с tenant_id.
	•	Чек-констрейнт на status in ('active','inactive').
	•	На locations.tz — валидация через чек (например, tz ~ '^[A-Za-z_]+/[A-Za-z_]+'), либо храни как enum.
	3.	RLS-каркас (многотенантность)
	•	Включи RLS на всех 4 таблицах.
	•	Политика: tenant_id = auth.jwt()->>'tenant_id' для SELECT/INSERT/UPDATE/DELETE.
	•	Создай безопасные VIEW (например, v_location_brands) для чтения в админке, чтобы не повторять условие.
	4.	Сид-данные для быстрой проверки
	•	1 tenant («Demo Tenant»).
	•	2 brands («Brand A», «Brand B»).
	•	1–2 locations («Main Street», «Downtown»).
	•	Заполни location_brands (например, в Main Street активны оба бренда, в Downtown — только «Brand A»).
	5.	Техническая проверка связности
	•	Запросом проверь, что видишь только свой tenant:

select l.name as location, b.name as brand, lb.status
from location_brands lb
join locations l on l.id = lb.location_id
join brands b on b.id = lb.brand_id;


	•	Попробуй удалить tenant и убедись, что каскадом уходит всё связанное (на демо-БД).

	6.	Подготовь модели/типы на FE/BE
	•	В общем пакете @/types определи TenantId, BrandId, LocationId.
	•	В BE добавь репозитории/сервисы: TenantsRepo, BrandsRepo, LocationsRepo + методы: listByTenant, attachBrandToLocation, detachBrandFromLocation.

⸻

Acceptance Criteria (AC)
	•	Созданы 4 таблицы с индексами и внешними ключами; включён RLS.
	•	Политики RLS гарантируют изоляцию по tenant_id для всех операций.
	•	Есть сиды: 1 tenant, 2 бренда, 2 локации, корректные связи в location_brands.
	•	Запрос к location_brands возвращает ожидаемую матрицу «локация ↔ бренд» только для текущего tenant_id.
	•	Удаление tenant удаляет каскадом все связанные бренды, локации и привязки (проверено на демо).

Definition of Done (DoD)
	•	Миграции применяются на чистой БД без ошибок.
	•	Включён RLS и существуют политики для всех 4 таблиц.
	•	Сид-скрипт (pnpm db:seed) создаёт демо-данные.
	•	Есть короткий README в папке миграций: схема, связи, как проверить.
	•	Юнит-тест репозитория (минимум) на attach/detach и на фильтрацию по tenant_id.

Подсказки и грабли
	•	Не хардкоди tenant_id в коде — читай его из JWT/контекста.
	•	Следи за уникальностью (tenant_id, slug) для брендов — это пригодится в URL/маппингах.
	•	address держи как jsonb с валидацией в коде (город, широта/долгота), чтобы не плодить колонок.

