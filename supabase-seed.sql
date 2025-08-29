-- Сид тестовых данных для заказов (обновленная схема)
-- Предполагаем, что у нас есть tenant_id и menu_items уже созданы

-- Функция для генерации случайных данных
CREATE OR REPLACE FUNCTION generate_test_orders(tenant_uuid UUID) RETURNS void AS $$
DECLARE
    order_record RECORD;
    menu_item_record RECORD;
    order_id UUID;
    menu_item_id UUID;
    order_total_cents INT;
    items_total_cents INT;
    item_count INT;
    payment_exists BOOLEAN;
    payment_amount_cents INT;
    delivery_fee_cents INT;
    tax_cents INT;
BEGIN
    -- Получаем menu_items для этого tenant
    FOR menu_item_record IN 
        SELECT id, price_cents FROM menu_items WHERE tenant_id = tenant_uuid LIMIT 8
    LOOP
        -- Создаем 15 заказов
        FOR i IN 1..15 LOOP
            -- Рассчитываем delivery_fee для delivery заказов
            delivery_fee_cents := CASE WHEN (i % 2) = 1 THEN 200 ELSE 0 END;
            
            -- Создаем заказ
            INSERT INTO orders (
                tenant_id,
                status,
                total_cents,
                items_total_cents,
                tax_cents,
                delivery_fee_cents,
                is_test,
                order_type,
                payment_method,
                payment_status,
                expected_at,
                channel,
                customer_name,
                customer_phone,
                customer_comment,
                delivery_address,
                created_at
            ) VALUES (
                tenant_uuid,
                CASE (i % 6)
                    WHEN 0 THEN 'pending'
                    WHEN 1 THEN 'accepted'
                    WHEN 2 THEN 'in_progress'
                    WHEN 3 THEN 'en_route'
                    WHEN 4 THEN 'completed'
                    WHEN 5 THEN 'canceled'
                END,
                0, -- Будет обновлено после добавления items
                0, -- Будет обновлено после добавления items
                0, -- Будет обновлено после добавления items
                delivery_fee_cents,
                CASE WHEN i <= 5 THEN true ELSE false END,
                CASE (i % 2) WHEN 0 THEN 'pickup' ELSE 'delivery' END,
                CASE (i % 3)
                    WHEN 0 THEN 'card'
                    WHEN 1 THEN 'cash'
                    WHEN 2 THEN 'other'
                END,
                CASE (i % 3)
                    WHEN 0 THEN 'unpaid'
                    WHEN 1 THEN 'paid'
                    WHEN 2 THEN 'refunded'
                END,
                CASE WHEN (i % 2) = 1 THEN NOW() + INTERVAL '30 minutes' ELSE NULL END,
                CASE (i % 3)
                    WHEN 0 THEN 'web'
                    WHEN 1 THEN 'app'
                    WHEN 2 THEN 'partner'
                END,
                CASE (i % 4)
                    WHEN 0 THEN 'Иван Петров'
                    WHEN 1 THEN 'Мария Сидорова'
                    WHEN 2 THEN 'Алексей Козлов'
                    WHEN 3 THEN 'Елена Иванова'
                END,
                '+7' || (900 + (i % 100))::text || (1000000 + (i % 9000000))::text,
                CASE (i % 4)
                    WHEN 0 THEN 'Без лука, пожалуйста'
                    WHEN 1 THEN 'Острое'
                    WHEN 2 THEN 'Доставка до двери'
                    WHEN 3 THEN 'Позвонить перед доставкой'
                END,
                CASE WHEN (i % 2) = 1 THEN 
                    jsonb_build_object(
                        'street', 'ул. Пушкина, д. ' || (i % 20 + 1)::text,
                        'city', 'Москва',
                        'zip', '100000',
                        'apt', (i % 100 + 1)::text,
                        'lat', 55.7558 + (i % 10) * 0.001,
                        'lon', 37.6176 + (i % 10) * 0.001
                    )
                ELSE NULL END,
                NOW() - INTERVAL '1 day' * (i % 7) - INTERVAL '1 hour' * (i % 24)
            ) RETURNING id, total_cents INTO order_record;
            
            order_id := order_record.id;
            items_total_cents := 0;
            
            -- Добавляем 1-3 order_items
            item_count := 1 + (i % 3);
            
            FOR j IN 1..item_count LOOP
                -- Выбираем случайный menu_item
                SELECT id, price_cents INTO menu_item_record 
                FROM menu_items 
                WHERE tenant_id = tenant_uuid 
                ORDER BY RANDOM() 
                LIMIT 1;
                
                menu_item_id := menu_item_record.id;
                
                -- Добавляем order_item
                INSERT INTO order_items (
                    tenant_id,
                    order_id,
                    item_id,
                    item_name,
                    qty,
                    unit_price_cents,
                    modifiers,
                    subtotal_cents
                ) VALUES (
                    tenant_uuid,
                    order_id,
                    menu_item_id,
                    (SELECT name FROM menu_items WHERE id = menu_item_id),
                    1 + (j % 3), -- 1-3 штуки
                    menu_item_record.price_cents,
                    CASE (j % 3)
                        WHEN 0 THEN jsonb_build_array(jsonb_build_object('name', 'Без соуса', 'value', 'true', 'price_delta_cents', 0))
                        WHEN 1 THEN jsonb_build_array(jsonb_build_object('name', 'Острое', 'value', 'true', 'price_delta_cents', 50))
                        WHEN 2 THEN NULL
                    END,
                    menu_item_record.price_cents * (1 + (j % 3))
                );
                
                items_total_cents := items_total_cents + (menu_item_record.price_cents * (1 + (j % 3)));
            END LOOP;
            
            -- Рассчитываем налог (10% от items_total)
            tax_cents := items_total_cents * 0.1;
            
            -- Обновляем total_cents в заказе
            UPDATE orders SET 
                total_cents = items_total_cents + tax_cents + delivery_fee_cents,
                items_total_cents = items_total_cents,
                tax_cents = tax_cents
            WHERE id = order_id;
            
            -- Добавляем payment для 70% заказов
            payment_exists := (i % 10) < 7;
            
            IF payment_exists THEN
                payment_amount_cents := items_total_cents + tax_cents + delivery_fee_cents;
                
                -- Для некоторых заказов делаем частичную оплату
                IF (i % 5) = 0 THEN
                    payment_amount_cents := payment_amount_cents * 0.8; -- 80% от суммы
                END IF;
                
                INSERT INTO payments (
                    tenant_id,
                    order_id,
                    provider,
                    provider_ref,
                    amount_cents,
                    status,
                    is_test,
                    created_at
                ) VALUES (
                    tenant_uuid,
                    order_id,
                    CASE (i % 3)
                        WHEN 0 THEN 'stripe'
                        WHEN 1 THEN 'cash'
                        WHEN 2 THEN 'yookassa'
                    END,
                    'txn_' || substr(md5(random()::text), 1, 16),
                    payment_amount_cents,
                    CASE (i % 3)
                        WHEN 0 THEN 'paid'
                        WHEN 1 THEN 'unpaid'
                        WHEN 2 THEN 'refunded'
                    END,
                    CASE WHEN i <= 5 THEN true ELSE false END,
                    NOW() - INTERVAL '1 day' * (i % 7) - INTERVAL '30 minutes' * (i % 60)
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Комментарий: выполните эту функцию для конкретного tenant_id
-- SELECT generate_test_orders('your-tenant-uuid-here');
