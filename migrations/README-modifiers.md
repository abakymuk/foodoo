# T-03. Модификаторы: группы и опции

## Описание

Система модификаторов позволяет создавать гибкие группы опций (например, "Выберите белок", "Дополнительные топпинги") и привязывать их к позициям меню с правилами выбора (min/max/required/exclusive), локализацией и наценками.

## Схема базы данных

### Таблицы

#### `modifier_groups` - Группы модификаторов
- `id` - UUID, первичный ключ
- `tenant_id` - UUID, внешний ключ на tenants
- `code` - TEXT, уникальный код группы в рамках tenant
- `status` - TEXT, статус ('active', 'inactive')
- `min` - INTEGER, минимальное количество выборов (по умолчанию 0)
- `max` - INTEGER, максимальное количество выборов (по умолчанию 1)
- `required` - BOOLEAN, обязательный выбор (по умолчанию false)
- `exclusive` - BOOLEAN, взаимоисключающий выбор (по умолчанию false)
- `display` - TEXT, тип отображения ('list', 'radio', 'quantity')

#### `modifier_group_i18n` - Локализация групп
- `group_id` - UUID, внешний ключ на modifier_groups
- `locale` - TEXT, код локали
- `title` - TEXT, название группы
- `description` - TEXT, описание (опционально)

#### `modifiers` - Опции модификаторов
- `id` - UUID, первичный ключ
- `group_id` - UUID, внешний ключ на modifier_groups
- `code` - TEXT, уникальный код опции в рамках группы
- `status` - TEXT, статус ('active', 'inactive')
- `price_delta` - NUMERIC(10,2), наценка за опцию
- `default_qty` - INTEGER, количество по умолчанию
- `max_qty` - INTEGER, максимальное количество
- `inventory_link_id` - UUID, связь с инвентарем (на будущее)
- `sort` - INTEGER, порядок сортировки

#### `modifier_i18n` - Локализация опций
- `modifier_id` - UUID, внешний ключ на modifiers
- `locale` - TEXT, код локали
- `title` - TEXT, название опции
- `description` - TEXT, описание (опционально)

#### `item_modifier_groups` - Привязка групп к позициям
- `id` - UUID, первичный ключ
- `tenant_id` - UUID, внешний ключ на tenants
- `item_id` - UUID, внешний ключ на items (опционально)
- `variant_id` - UUID, внешний ключ на item_variants (опционально)
- `group_id` - UUID, внешний ключ на modifier_groups
- `sort` - INTEGER, порядок сортировки
- `min` - INTEGER, оверрайд минимального количества
- `max` - INTEGER, оверрайд максимального количества
- `required` - BOOLEAN, оверрайд обязательности
- `exclusive` - BOOLEAN, оверрайд взаимоисключения
- `display` - TEXT, оверрайд типа отображения
- `default_selection_json` - JSONB, дефолтная выборка

### Индексы

- Уникальный индекс на `(tenant_id, code)` для modifier_groups
- Уникальный индекс на `(group_id, code)` для modifiers
- Уникальный индекс на `(group_id, locale)` для modifier_group_i18n
- Уникальный индекс на `(modifier_id, locale)` для modifier_i18n
- Индексы для производительности на tenant_id, status, sort

### Ограничения

#### CHECK Constraints
- `status` в ('active', 'inactive')
- `display` в ('list', 'radio', 'quantity')
- `min <= max`
- `exclusive = true → max = 1`
- `required = true → max >= 1`
- `default_qty <= max_qty`

#### Foreign Keys
- Все внешние ключи с `ON DELETE CASCADE`
- `item_modifier_groups` требует хотя бы один из `item_id` или `variant_id`

### RLS (Row Level Security)

Все таблицы защищены RLS с политиками:
- `modifier_groups`: доступ только к группам текущего tenant
- `modifier_group_i18n`: доступ через связь с группами tenant
- `modifiers`: доступ через связь с группами tenant
- `modifier_i18n`: доступ через связь с модификаторами tenant
- `item_modifier_groups`: доступ только к привязкам текущего tenant

### Триггеры валидации

1. **validate_modifier_group_rules** - проверяет правила групп
2. **validate_modifier_rules** - проверяет правила модификаторов
3. **validate_item_modifier_group_rules** - проверяет правила привязок

## Backend Actions

### Группы модификаторов (`app/app/actions/modifier-groups.ts`)

- `getModifierGroups(params)` - получение списка групп с фильтрацией
- `getModifierGroupById(id, locale)` - получение группы по ID
- `getModifierGroupWithModifiers(id, locale)` - получение группы с модификаторами
- `createModifierGroup(data)` - создание группы с i18n
- `updateModifierGroup(id, data)` - обновление группы
- `deleteModifierGroup(id)` - удаление группы

### Модификаторы (`app/app/actions/modifiers.ts`)

- `getModifiers(params)` - получение списка модификаторов
- `getModifierById(id, locale)` - получение модификатора по ID
- `createModifier(groupId, data)` - создание модификатора в группе
- `updateModifier(id, data)` - обновление модификатора
- `deleteModifier(id)` - удаление модификатора

### Привязки к позициям (`app/app/actions/item-modifier-groups.ts`)

- `getItemModifiers(itemId, locale)` - получение модификаторов позиции
- `getVariantModifiers(variantId, locale)` - получение модификаторов варианта
- `attachModifierGroupToItem(itemId, groupId, data)` - привязка группы к позиции
- `attachModifierGroupToVariant(variantId, groupId, data)` - привязка группы к варианту
- `updateItemModifierGroup(bindingId, data)` - обновление привязки
- `deleteItemModifierGroup(bindingId)` - удаление привязки

## TypeScript типы

Все типы определены в `types/modifiers.ts`:

- `ModifierGroup`, `ModifierGroupWithI18n`, `ModifierGroupWithModifiers`
- `Modifier`, `ModifierWithI18n`
- `ItemModifierGroup`, `ModifierGroupWithOverrides`
- `CreateModifierGroupData`, `UpdateModifierGroupData`
- `CreateModifierData`, `UpdateModifierData`
- `CreateItemModifierGroupData`, `UpdateItemModifierGroupData`

## Правила валидации

### Группы модификаторов
1. `min <= max`
2. `exclusive = true → max = 1`
3. `required = true → max >= 1`
4. Уникальный `code` в рамках tenant

### Модификаторы
1. `default_qty <= max_qty`
2. Уникальный `code` в рамках группы

### Привязки к позициям
1. Хотя бы один из `item_id` или `variant_id` должен быть указан
2. Оверрайды должны соответствовать правилам групп
3. `variant_id` должен принадлежать тому же tenant

### Приоритеты оверрайдов
1. `variant-level` > `item-level` > `group defaults`

## Сид-данные

Создаются демонстрационные данные:
- Группа "protein" (min=1, max=1, required=true, exclusive=true, display='radio')
  - Опции: chicken (0.00), beef (+1.50), tofu (+0.50)
- Группа "extras" (min=0, max=3, required=false, exclusive=false, display='list')
  - Опции: cheese (+0.80), bacon (+1.20), jalapeno (+0.40)
- Привязки к Chicken Bowl (item-level)
- Оверрайд для large варианта: extras.max=4

## Тестирование

### Unit тесты (`__tests__/modifiers.test.ts`)

Покрывают:
- CRUD операции для групп модификаторов
- CRUD операции для модификаторов
- Привязки к позициям и вариантам
- Правила валидации
- Обработку ошибок

### SQL тесты (`test-modifiers.sql`)

Проверяют:
- Создание таблиц и индексов
- RLS политики
- Триггеры валидации
- Foreign key constraints
- Каскадные удаления

## Как проверить

1. **Применить миграцию:**
   ```bash
   psql $DATABASE_URL -f supabase-modifiers-schema.sql
   ```

2. **Запустить тесты:**
   ```bash
   pnpm test __tests__/modifiers.test.ts
   ```

3. **Проверить схему:**
   ```bash
   psql $DATABASE_URL -f test-modifiers.sql
   ```

4. **Проверить сид-данные:**
   ```sql
   -- Раскомментировать в test-modifiers.sql
   SELECT mg.code, mg.min, mg.max, mg.required, mg.exclusive, mg.display
   FROM modifier_groups mg;
   ```

## API Endpoints

### Группы модификаторов
- `GET /admin/modifier-groups?status=&q=&locale=` - список групп
- `POST /admin/modifier-groups` - создание группы
- `PATCH /admin/modifier-groups/:id` - обновление группы
- `DELETE /admin/modifier-groups/:id` - удаление группы

### Модификаторы
- `POST /admin/modifier-groups/:id/modifiers` - создание модификатора
- `PATCH /admin/modifiers/:id` - обновление модификатора
- `DELETE /admin/modifiers/:id` - удаление модификатора

### Привязки к позициям
- `GET /admin/items/:id/modifiers?locale=` - модификаторы позиции
- `POST /admin/items/:id/modifier-groups` - привязка группы к позиции
- `POST /admin/variants/:id/modifier-groups` - привязка группы к варианту
- `PATCH /admin/item-modifier-groups/:id` - обновление привязки
- `DELETE /admin/item-modifier-groups/:id` - удаление привязки

## Следующие шаги

1. **Frontend страницы:**
   - Страница управления группами модификаторов
   - Страница управления модификаторами в группе
   - Вкладка "Модификаторы" в редакторе позиций

2. **Расчёт цен:**
   - Интеграция с системой цен
   - Динамический расчёт стоимости с модификаторами

3. **Инвентарь:**
   - Связь модификаторов с инвентарём
   - Контроль доступности опций

4. **Публикация:**
   - Правила доступности модификаторов
   - Временные ограничения

## Примечания

- Система поддерживает многоязычность через i18n таблицы
- Оверрайды позволяют настраивать правила для конкретных позиций/вариантов
- Каскадные удаления обеспечивают целостность данных
- RLS обеспечивает изоляцию данных по tenant
- Триггеры валидации предотвращают некорректные данные на уровне БД
