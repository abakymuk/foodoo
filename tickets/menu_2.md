T-02. Каталог: категории → позиции → варианты (+ i18n и медиа)

Цель: завести базовый каталог меню: категории бренда, позиции (items) и их варианты (variants) с локализацией и изображениями.

Зачем: это «скелет» меню. Позже на него лягут модификаторы, цены, правила доступности и публикации.



Что сделать (простыми шагами)
	1.	Схема БД (Drizzle миграции для Supabase/Postgres)
Таблицы и ключевые поля:
	•	categories
	•	id uuid pk, tenant_id uuid not null fk, brand_id uuid null fk
	•	code text not null (машинный код/slug в рамках бренда/тенанта)
	•	sort int default 100, status text default 'active'
	•	Уникальность: (tenant_id, coalesce(brand_id, '00000000-0000-0000-0000-000000000000'), code)
	•	Чек: status in ('active','inactive')
	•	category_i18n
	•	category_id fk, locale text, title text not null, description text null
	•	Уникальность: (category_id, locale)
	•	items
	•	id uuid pk, tenant_id fk, base_sku text not null, product_type text not null
	•	status text default 'active', allergen_mask int default 0, kds_station text null, print_profile text null
	•	Уник: (tenant_id, base_sku)
	•	Чеки: product_type in ('simple','variant'), status in ('active','inactive')
	•	item_i18n
	•	item_id fk, locale text, title text not null, description text null, seo_meta jsonb null
	•	Уник: (item_id, locale)
	•	item_media
	•	id uuid pk, item_id fk, kind text (primary|gallery|icon), url text not null, alt text null, aspect_ratio text null
	•	Чек: kind in ('primary','gallery','icon')
	•	item_variants
	•	id uuid pk, item_id fk, variant_sku text not null, is_default bool default false
	•	size text null, weight numeric null, volume numeric null, barcode text null
	•	Уник: (item_id, variant_sku)
	•	Уник (частичный): максимум один дефолт — unique(item_id) where is_default
	•	category_items (связка MANY-to-MANY)
	•	category_id fk, item_id fk, sort int default 100
	•	PK: (category_id, item_id)
FKs — с on delete cascade. Индексы: по tenant_id, brand_id, status, product_type.
	2.	RLS (изоляция по tenant)
	•	Включи RLS на всех таблицах.
	•	Политики: tenant_id = auth.jwt()->>'tenant_id' для SELECT/INSERT/UPDATE/DELETE.
	•	Доп. правило целостности в category_items: вставка разрешена только если item.tenant_id = category.tenant_id.
	3.	Сид-данные (минимум для проверки)
	•	Категории для Brand A: burgers, bowls (i18n: en-US, ru-RU).
	•	Позиции:
	•	Chicken Bowl (product_type='variant') + варианты: small (default), large.
	•	Beef Burger (product_type='simple') без вариантов.
	•	Привяжи позиции к категориям через category_items.
	•	Добавь по одному item_media.primary на каждую позицию (URL-заглушки).
	4.	Простые CRUD-эндпоинты (BFF/BE)
	•	GET /admin/categories?brand_id=&status= (листинг с i18n locale=)
	•	POST /admin/categories / PATCH /admin/categories/:id / DELETE …
	•	GET /admin/items?status=&product_type= (+ join i18n, media, variants)
	•	POST /admin/items / PATCH /admin/items/:id (+ управление variants и media)
	•	POST /admin/category-items (привязать позицию к категории/сорт)
Все ответы — в рамках текущего tenant_id, с валидацией кодов/уникальностей.
	5.	Мини-превью каталога (для FE/админки)
	•	GET /admin/catalog-tree?brand_id=&locale=
Возвращает простое дерево: [ {category:{id, title}, items:[{id, title, media.primary, product_type, variants:[…]}]} ]
Это поможет позже подключить «Превью меню по контексту».
	6.	Валидации и бизнес-правила (минимум)
	•	Если product_type='variant' — должен быть хотя бы один вариант и ровно один is_default=true (проверка на уровне сервиса + тест).
	•	Нельзя привязать item к category разных брендов, если у категории задан brand_id и item принадлежит другому бренду-каталогу (на этом этапе считаем, что item — tenant-wide; строгая проверка: разрешаем привязку к любой бренд-категории внутри одного tenant).

⸻

Acceptance Criteria (AC)
	•	Созданы 7 таблиц, индексы и внешние ключи; включён RLS с изоляцией по tenant_id.
	•	Работают CRUD-операции для категорий, позиций, вариантов и медиа.
	•	Работает связка category_items (добавить/удалить позицию из категории, сортировка).
	•	GET /admin/catalog-tree?brand_id=&locale= возвращает корректную структуру с i18n и медиа.
	•	Для variant-товаров ровно один is_default=true; для simple вариантов нет.
	•	Сиды создают 2 категории, 2 позиции, 2 варианта у одной позиции, медиа и привязки.

Definition of Done (DoD)
	•	Миграции применяются на чистой БД без ошибок.
	•	Включён RLS и политики покрывают все операции.
	•	pnpm db:seed создаёт демо-каталог.
	•	CRUD-ручки имеют базовые юнит-тесты и валидацию.
	•	GET /admin/catalog-tree отдаёт дерево ≤200 мс на демо-данных.
	•	Короткий README: схема, как сидировать, примеры запросов.

Подсказки и грабли
	•	Сразу вводи code/slug для категорий — пригодится для маппингов и SEO.
	•	Не перегружай item_variants полями — размер/вес/объём оставь опционально.
	•	Изображения: храни только ссылки; сами файлы — в Supabase Storage (настроим в отдельной задаче).
	•	Частичный уникальный индекс на is_default спасает от двух дефолтов, но «хотя бы один» проверь тестами/сервисом.

