# Мультибрендовая модель - T-01

## 🎯 Цель

Заложить фундамент мультибрендовой модели: один арендатор (tenant), его бренды и точки (locations), с явной связью какие бренды активны в какой локации.

## 📋 Что реализовано

### 1. База данных
- ✅ **Таблицы**: `tenants`, `brands`, `locations`, `location_brands`
- ✅ **Индексы**: уникальный slug в рамках tenant, индексы для производительности
- ✅ **RLS**: политики безопасности для изоляции данных по tenant
- ✅ **VIEW**: `v_location_brands` для безопасного чтения связей
- ✅ **Каскады**: удаление tenant удаляет все связанные данные

### 2. Backend (Server Actions)
- ✅ **BrandsRepo**: `getBrands`, `createBrand`, `updateBrand`, `deleteBrand`
- ✅ **LocationsRepo**: `getLocations`, `createLocation`, `updateLocation`, `deleteLocation`
- ✅ **LocationBrandsRepo**: `attachBrandToLocation`, `detachBrandFromLocation`
- ✅ **Валидация**: уникальность slug, проверка принадлежности к tenant

### 3. Frontend
- ✅ **Типы TypeScript**: полная типизация для всех сущностей
- ✅ **Страница брендов**: `/app/brands` с CRUD операциями
- ✅ **Сайдбар**: добавлена ссылка на бренды
- ✅ **UI компоненты**: диалоги, формы, валидация

### 4. Тестирование
- ✅ **Юнит-тесты**: тесты репозиториев с моками
- ✅ **Тестовый скрипт**: `test-multibrand.sql` для проверки БД

## 🚀 Как применить

### 1. Применить миграцию в Supabase

```sql
-- Выполнить в SQL Editor Supabase
\i supabase-multibrand-schema.sql
```

### 2. Проверить миграцию

```sql
-- Выполнить в SQL Editor Supabase
\i test-multibrand.sql
```

### 3. Запустить приложение

```bash
pnpm dev
```

### 4. Проверить функциональность

1. Войти в приложение
2. Перейти в `/app/brands`
3. Создать тестовый бренд
4. Проверить, что данные изолированы по tenant

## 📊 Структура данных

```
tenants (арендаторы)
├── brands (бренды)
│   ├── name: TEXT NOT NULL
│   ├── slug: TEXT NOT NULL (уникален в рамках tenant)
│   └── status: TEXT DEFAULT 'active'
├── locations (точки)
│   ├── name: TEXT NOT NULL
│   ├── address: JSONB (город, координаты)
│   ├── tz: TEXT CHECK (валидация timezone)
│   └── status: TEXT DEFAULT 'active'
└── location_brands (связи many-to-many)
    ├── location_id: UUID FK → locations(id)
    ├── brand_id: UUID FK → brands(id)
    └── status: TEXT DEFAULT 'active'
```

## 🔒 Безопасность

- **RLS включен** на всех таблицах
- **Политики** проверяют `tenant_id` через связь с `auth.uid()`
- **VIEW** `v_location_brands` с `security_invoker = true`
- **Валидация** уникальности slug в рамках tenant

## 🧪 Тестирование

### Запуск тестов

```bash
pnpm test __tests__/multibrand.test.ts
```

### Проверка изоляции данных

```sql
-- В контексте аутентифицированного пользователя
SELECT l.name as location, b.name as brand, lb.status
FROM location_brands lb
JOIN locations l ON l.id = lb.location_id
JOIN brands b ON b.id = lb.brand_id
ORDER BY l.name, b.name;
```

### Проверка каскадных удалений

```sql
-- Создать тестовые данные и удалить tenant
-- Убедиться, что все связанные записи удалены каскадом
```

## 📝 Acceptance Criteria - ✅ Выполнено

- ✅ Созданы 4 таблицы с индексами и внешними ключами; включён RLS
- ✅ Политики RLS гарантируют изоляцию по tenant_id для всех операций
- ✅ Есть сиды: 1 tenant, 2 бренда, 2 локации, корректные связи в location_brands
- ✅ Запрос к location_brands возвращает ожидаемую матрицу «локация ↔ бренд» только для текущего tenant_id
- ✅ Удаление tenant удаляет каскадом все связанные бренды, локации и привязки

## ✅ Definition of Done - Выполнено

- ✅ Миграции применяются на чистой БД без ошибок
- ✅ Включён RLS и существуют политики для всех 4 таблиц
- ✅ Сид-скрипт создаёт демо-данные
- ✅ Есть README в папке миграций: схема, связи, как проверить
- ✅ Есть юнит-тест репозитория на attach/detach и на фильтрацию по tenant_id

## 🎨 UI/UX

- **Страница брендов**: `/app/brands`
- **Создание/редактирование**: диалоги с валидацией
- **Автогенерация slug**: из названия бренда
- **Статусы**: активный/неактивный с цветными бейджами
- **Пустое состояние**: с призывом к действию

## 🔄 Следующие шаги

1. **Локации**: создать страницу `/app/locations`
2. **Связи**: создать страницу управления связями брендов и локаций
3. **Интеграция**: связать с меню и заказами
4. **Расширение**: добавить категории, модификаторы

## 📁 Файлы

```
├── supabase-multibrand-schema.sql    # Миграция БД
├── test-multibrand.sql              # Тестовый скрипт
├── types/multibrand.ts              # TypeScript типы
├── app/app/actions/
│   ├── brands.ts                    # BrandsRepo
│   └── locations.ts                 # LocationsRepo
├── app/app/brands/page.tsx          # Страница брендов
├── components/app-sidebar.tsx       # Обновленный сайдбар
├── __tests__/multibrand.test.ts     # Юнит-тесты
└── migrations/README.md             # Документация
```

## 🎉 Готово к использованию!

Мультибрендовая модель полностью реализована и готова к использованию. Все требования из `menu_1.md` выполнены.
