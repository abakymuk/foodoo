T-03. Модификаторы: группы и опции (+ привязка к item/variant, i18n, min/max, цены)

Цель: добавить гибкие модификаторы (группы и опции) и привязать их к позициям/вариантам с правилами выбора (min/max/required/exclusive), локализацией и наценками.

Зачем: модификаторы — ключ к чеку, марже и UX («выбор протеина», «добавь сыр», «соусы»). Без них меню не живое.

⸻

Что сделать (простыми шагами)
	1.	Схема БД (миграции Drizzle → Supabase/Postgres)
Таблицы:
	•	modifier_groups
	•	id uuid pk, tenant_id uuid fk, code text not null, status text default 'active'
	•	min int default 0, max int default 1, required bool default false, exclusive bool default false
	•	display text default 'list'  (list|radio|quantity)
	•	Уник: (tenant_id, code)
	•	Чеки:
	•	status in ('active','inactive')
	•	min <= max
	•	exclusive = true → max = 1
	•	required = true → max >= 1
	•	modifier_group_i18n
	•	group_id fk, locale text, title text not null, description text null
	•	Уник: (group_id, locale)
	•	modifiers
	•	id uuid pk, group_id uuid fk, code text not null, status text default 'active'
	•	price_delta numeric(10,2) default 0, default_qty int default 0, max_qty int default 1
	•	inventory_link_id uuid null (на будущее), sort int default 100
	•	Уник: (group_id, code)
	•	Чеки: default_qty <= max_qty, status in ('active','inactive')
	•	modifier_i18n
	•	modifier_id fk, locale text, title text not null, description text null
	•	Уник: (modifier_id, locale)
	•	item_modifier_groups (привязка группы к item/variant + локальные оверрайды)
	•	id uuid pk, tenant_id uuid fk, item_id uuid fk null, variant_id uuid fk null, group_id uuid fk not null
	•	sort int default 100
	•	Оверрайды правил (опционально): min int null, max int null, required bool null, exclusive bool null, display text null
	•	default_selection_json jsonb null (массив {modifier_id, qty})
	•	Чеки:
	•	хотя бы одно из item_id или variant_id не null
	•	если указаны min/max/required/exclusive, они валидны по тем же правилам, что в группе
Идея разрешения: variant-level > item-level > group defaults.
FKs с on delete cascade. Индексы: по tenant_id, group_id, item_id, variant_id.
	2.	RLS (изоляция)
	•	Включи RLS на всех таблицах с tenant_id (modifier_groups, item_modifier_groups).
	•	Для modifiers и i18n RLS наследуется через join к своей группе (используй WITH CHECK на вставку по группе того же tenant_id).
	•	Политики: только строки текущего tenant_id.
	3.	Сид-данные (для проверки)
	•	Группа protein (min=1, max=1, required=true, exclusive=true, display='radio').
	•	Опции: chicken (price_delta=0), beef (+1.50), tofu (+0.50).
	•	Группа extras (min=0, max=3, required=false, exclusive=false, display='list').
	•	Опции: cheese (+0.80), bacon (+1.20), jalapeno (+0.40).
	•	Привязать к Chicken Bowl (item-level): protein и extras.
	•	Привязать к варианту v_large отдельный override extras.max=4 (пример variant-override).
	4.	Валидации (в сервисе/транзакциях)
	•	min <= max. Если required=true — min >= 1. Если exclusive=true — max = 1.
	•	При сохранении default_selection_json проверяй:
	•	опции принадлежат той же группе;
	•	сумма выбранных опций (с учётом qty) ∈ [min,max];
	•	qty каждой опции ≤ max_qty из modifiers;
	•	для exclusive=true не более одной опции (qty>0).
	•	При привязке к variant_id — добавь check, что variant.item_id соответствует item (или упрощённо: существующий variant из того же tenant).
	5.	CRUD-эндпоинты (admin/BFF)
	•	Группы:
	•	GET /admin/modifier-groups?status=&q=
	•	POST /admin/modifier-groups (создать + i18n)
	•	PATCH /admin/modifier-groups/:id
	•	Опции:
	•	POST /admin/modifier-groups/:id/modifiers
	•	PATCH /admin/modifiers/:id
	•	Привязка к item/variant:
	•	GET /admin/items/:id/modifiers (возвращает список групп, их опции, применённые оверрайды, default_selection)
	•	POST /admin/items/:id/modifier-groups (attach; можно сразу с оверрайдами и default_selection)
	•	POST /admin/variants/:id/modifier-groups (attach variant-level)
	•	PATCH /admin/item-modifier-groups/:id (менять оверрайды, default_selection, sort)
	•	DELETE /admin/item-modifier-groups/:id
	6.	Админ-UX (минимум)
	•	Экран «Группы модификаторов»: список → карточка группы → вкладка «Опции».
	•	Экран «Позиция» → вкладка «Модификаторы»:
	•	список привязанных групп (drag-sort),
	•	кнопка «Добавить группу»,
	•	редактор оверрайдов (min/max/required/exclusive/display),
	•	мастер default_selection (валидирует количество и лимиты),
	•	переключатель «Редактировать для варианта» (показывает variant-overrides).
	7.	Расчёт цены (эскиз, на будущее, но проверь формулу в тестах)
	•	final_item_price = base_price (item/variant) + Σ(modifier.price_delta * qty)
Отложим динамику и промо — добавим в задачах про цены.

⸻

Acceptance Criteria (AC)
	•	Таблицы modifier_groups, modifier_group_i18n, modifiers, modifier_i18n, item_modifier_groups созданы, RLS включён, уникальности и чек-констрейнты работают.
	•	Можно создать группы и опции с i18n; привязать группу к item и к отдельному variant; задать оверрайды и default_selection.
	•	Валидации не позволяют сохранить некорректные min/max/required/exclusive и default_selection вне диапазонов.
	•	GET /admin/items/:id/modifiers возвращает объединённый вид: группы, опции, применённые оверрайды и default_selection (с учётом variant-override).
	•	Сиды: protein и extras привязаны к демо-позиции; для v_large действует extras.max=4.

Definition of Done (DoD)
	•	Миграции применяются без ошибок; индексы/уники/чеки на месте.
	•	Политики RLS изолируют данные по tenant_id.
	•	CRUD-ручки покрыты базовыми тестами, включая валидацию default_selection.
	•	Админ-страницы: создаю группу/опции, привязываю к item/variant, меняю оверрайды и порядок.
	•	Док: короткий README по правилам выбора и приоритетам (variant > item > group).

Подсказки и грабли
	•	Не дублируй правила в коде и БД: чётко храни дефолты в modifier_groups, а оверрайды — в item_modifier_groups.
	•	default_selection_json держи компактным: только {modifier_id, qty}; на клиенте рендерь из фактического списка опций.
	•	Для display='quantity' отдавай в контракте max_qty опции — это спасёт UI от лишних запросов.
	•	При удалении группы убедись, что каскадом снимаются привязки (item_modifier_groups).

