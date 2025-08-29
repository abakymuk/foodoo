T-04. Ценообразование: прайс-листы, цены и оверрайды (brand/location/channel/segment)

Цель: ввести управляемую систему цен: базовые прайс-листы на товары/варианты/модификаторы + оверрайды по бренду/локации/каналу/сегменту. Поддержать валюты, налоговую модель и базовую маржинальность.

Зачем: цены — главный рычаг выручки и маржи. Без явной модели и правил расчёта мы не сможем делать A/B, динамику и локальные корректировки.

⸻

Что сделать (простыми шагами)
	1.	Схема БД (Drizzle миграции для Supabase/Postgres)
Таблицы и ключевые поля:
	•	price_lists
	•	id uuid pk, tenant_id uuid fk, name text not null
	•	currency text not null (ISO 4217), tax_inclusive boolean default false
	•	strategy text default 'static' (static|rule|formula)
	•	status text default 'active'
	•	Уник: (tenant_id, name)
	•	Чеки: status in ('active','inactive'), strategy in ('static','rule','formula')
	•	prices
	•	id uuid pk, tenant_id uuid fk, price_list_id uuid fk
	•	entity text not null (item|variant|modifier)
	•	entity_id uuid not null
	•	base_price numeric(10,2) not null check(base_price>=0)
	•	compare_at numeric(10,2) null check(compare_at is null or compare_at>=base_price)
	•	cost numeric(10,2) null check(cost is null or cost>=0)
	•	margin_target numeric(5,2) null – целевая маржа в % (например, 65.00)
	•	Уник: (price_list_id, entity, entity_id)
	•	price_overrides
	•	id uuid pk, tenant_id uuid fk, price_list_id uuid fk
	•	entity text not null, entity_id uuid not null
	•	scope text not null (brand|location|channel|segment)
	•	scope_id uuid null  — для channel/segment хранить null, а значение в rule_expr
	•	rule_expr jsonb null — условия (напр., { "channel":"delivery" } или { "segment":"loyalty_t2" })
	•	value numeric(10,2) not null check(value>=0) — итоговая цена или надбавка? (см. ниже)
	•	mode text not null default 'absolute' (absolute|delta|percent)
	•	Индекс: (price_list_id, entity, entity_id, scope)
	•	currency_rules (опционально)
	•	tenant_id, currency, minor_units smallint default 2, rounding text default 'bankers' (bankers|up|down|half_up)
Примечания:
	•	Валюта в price_lists определяет валюту всех записей prices/price_overrides внутри списка.
	•	Для speed — индексы по (tenant_id, price_list_id), и по (entity, entity_id).
	2.	RLS
	•	Включить RLS на всех таблицах; политика: tenant_id = auth.jwt()->>'tenant_id' для всех операций.
	•	WITH CHECK на вставку/обновление, чтобы нельзя было ссылаться на чужой price_list_id.
	3.	Поведение/правила расчёта (алгоритм «эффективной цены»)
При расчёте цены учитываем иерархию сущностей и контекст:
	1.	База: найти prices по выбранному price_list_id и entity=(variant|item|modifier)
	•	приоритет: variant > item (если для варианта цены нет — взять цену item).
	2.	Применить оверрайды из price_overrides в порядке приоритета:
location > brand > channel > segment (или как утвердим для бизнеса).
	•	mode='absolute' → цена = value
	•	mode='delta' → цена = цена + value
	•	mode='percent' → цена = цена × (1 + value/100)
	•	если rule_expr присутствует — проверить соответствие контексту (channel, segment и т. п.).
	3.	Округление: применить правила валюты (minor_units, rounding).
	4.	Guard-rails (мягкие): при наличии cost и/или margin_target проверять, что итоговая цена ≥ cost и не падает ниже целевой маржи — предупреждать в UI (или блокировать, если флаг включён).
	5.	Tax: если tax_inclusive=false, выводить/хранить нетто; клиентский фронт показывает брутто в зависимости от юрисдикции. Если tax_inclusive=true — всё храним «включая налог».
Важное: на этапе T-04 не пересчитываем финальные цены в снапшот меню — это сделаем в задаче про публикацию. Но уже сейчас сделайте служебную SQL-функцию/репозиторий get_effective_price(context) для повторного использования.
	4.	Сиды
	•	price_list: Default USD (currency='USD', tax_inclusive=false).
	•	prices для демо-позиции/варианта и модификаторов (Chicken Bowl small=8.99, large=10.99, extras.cheese=0.80 как модификатор).
	•	price_overrides:
	•	scope='location' для Downtown: mode='percent', value=5 (наценка +5%).
	•	scope='channel' { "channel":"delivery" }: mode='absolute', value=11.49 для large.
	5.	API (admin/BFF, минимум)
	•	Прайс-листы:
	•	GET /admin/price-lists
	•	POST /admin/price-lists / PATCH /admin/price-lists/:id
	•	Цены:
	•	GET /admin/prices?price_list_id=&entity=&entity_id=
	•	POST /admin/prices / PATCH /admin/prices/:id
	•	Оверрайды:
	•	GET /admin/price-overrides?price_list_id=&entity=&entity_id=&scope=
	•	POST /admin/price-overrides / PATCH /admin/price-overrides/:id / DELETE …
	•	Сервис для расчёта (превью):
	•	GET /admin/price/preview?price_list_id=&entity=&entity_id=&location_id=&brand_id=&channel=&segment= → {base, applied:[…], final, currency, tax_inclusive}
	6.	Админ-UX (минимум)
	•	Экран «Прайс-листы»: список → детальная страница (валюта, налоговая модель, стратегия).
	•	Вкладка «Записи цен»: таблица entity/sku/base_price/cost/compare_at/margin%.
	•	Вкладка «Оверрайды»: фильтры по scope; редактор mode (absolute|delta|percent) + rule_expr (JSON-форма).
	•	Кнопка «Превью цены в контексте» — справа показывает base → overrides → final.
	7.	Валидации и правила бизнеса
	•	Нельзя смешивать валюты внутри одного price_list.
	•	compare_at ≥ base_price.
	•	Если задан cost, и включён флаг «минимальная маржа», то final_price ≥ cost / (1 - margin_min%).
	•	Для modifier цена — дельта по отношению к базовой цене item/variant?
	•	Для консистентности: храним как абсолют (можно 0.80), а в расчёте финала позицию считаем: final = item_price + Σ(mod_price);
	•	price_overrides модификатора работают аналогично (редко нужно, но поддержим).
	8.	Подготовить вычислитель (репозиторий/SQL-функцию)
	•	fn_get_effective_price(p_price_list uuid, p_entity text, p_id uuid, p_context jsonb)
Возвращает: {base, overrides:[{scope, mode, value, applied}], final, currency, tax_inclusive}
	•	Юнит-тесты на последовательность оверрайдов и округление.

⸻

Acceptance Criteria (AC)
	•	Созданы price_lists, prices, price_overrides (+ опционально currency_rules), включён RLS и индексы.
	•	Можно создать прайс-лист, записать цены для item/variant/modifier, задать оверрайды scope.
	•	Эндпоинт /admin/price/preview корректно считает итоговую цену по контексту (location/brand/channel/segment).
	•	Сиды демонстрируют: наценку по локации (+5%) и фикс-цену для доставки на крупный вариант.
	•	Валидации блокируют невалидные комбинации (отрицательная цена, compare_at ниже base, смешение валют).
	•	Есть функция/слой в BE для расчёта effective_price, покрытая тестами.

Definition of Done (DoD)
	•	Миграции применяются без ошибок, есть README с полями и примерами.
	•	RLS-политики корректны, проверены тестами.
	•	CRUD по прайс-листам/ценам/оверрайдам работает и валидируется.
	•	/admin/price/preview показывает цепочку применённых правил и итог.
	•	Покрытие тестами: приоритет variant>item, порядок оверрайдов, mode (absolute|delta|percent), округление по валюте.

Подсказки и грабли
	•	Сразу зафиксируй порядок приоритета оверрайдов (написать константой и в доке), иначе будет путаница.
	•	Храни rule_expr как JSON с простыми ключами (channel, segment). Не трать время на DSL; в будущем можно перейти на CEL.
	•	Для JPY/валют без копеек выстави minor_units=0 — проверь округление тестами.
	•	Избегай «магических» автопересчётов маржи — лучше предупреждение в UI, чем скрытый правка цены.
