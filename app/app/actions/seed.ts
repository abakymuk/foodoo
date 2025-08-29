"use server";

import { createClient } from "@/lib/auth/server";

export async function seedTestData() {
  console.log("Starting seedTestData...");
  const supabase = await createClient();
  
  // Получаем текущего пользователя
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Auth error:", authError);
    return { ok: false, error: "Not authenticated" };
  }

  console.log("User authenticated:", user.id);

  try {
    // Получаем tenant пользователя
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (tenantError || !tenant) {
      console.error("Tenant error:", tenantError);
      return { ok: false, error: "Tenant not found" };
    }

    console.log("Tenant found:", tenant.id);

    // Проверяем, есть ли уже menu_items
    const { data: existingMenuItems, error: existingMenuError } = await supabase
      .from("menu_items")
      .select("id")
      .eq("tenant_id", tenant.id)
      .limit(1);

    if (existingMenuError) {
      return { ok: false, error: existingMenuError.message };
    }

    // Если нет menu_items, создаем sample menu
    if (!existingMenuItems || existingMenuItems.length === 0) {
      const sampleItems = [
        { name: "Бургер Классический", price_cents: 1299 },
        { name: "Картошка Фри", price_cents: 449 },
        { name: "Кола", price_cents: 199 },
        { name: "Пицца Маргарита", price_cents: 899 },
        { name: "Салат Цезарь", price_cents: 699 },
        { name: "Чизбургер", price_cents: 1499 },
        { name: "Наггетсы", price_cents: 599 },
        { name: "Молочный коктейль", price_cents: 399 },
      ];

      const { error: insertError } = await supabase
        .from("menu_items")
        .insert(
          sampleItems.map(item => ({
            tenant_id: tenant.id,
            name: item.name,
            price_cents: item.price_cents,
            is_active: true,
          }))
        );

      if (insertError) {
        return { ok: false, error: insertError.message };
      }
    }

    // Создаем тестовые заказы напрямую (без PostgreSQL функции)
    console.log("Creating test orders directly...");
    
    const testOrders = [];
    for (let i = 1; i <= 15; i++) {
      const deliveryFee = i % 2 === 1 ? 200 : 0;
      const orderType = i % 2 === 0 ? 'pickup' : 'delivery';
      const paymentMethod = ['card', 'cash', 'other'][i % 3];
      const paymentStatus = ['unpaid', 'paid', 'refunded'][i % 3];
      const status = ['pending', 'accepted', 'in_progress', 'en_route', 'completed', 'canceled'][i % 6];
      const customerNames = ['Иван Петров', 'Мария Сидорова', 'Алексей Козлов', 'Елена Иванова'];
      const customerName = customerNames[i % 4];
      const customerPhone = `+7${900 + (i % 100)}${1000000 + (i % 9000000)}`;
      const comments = ['Без лука, пожалуйста', 'Острое', 'Доставка до двери', 'Позвонить перед доставкой'];
      const comment = comments[i % 4];
      
      const order = {
        tenant_id: tenant.id,
        status,
        total_cents: 0, // Будет обновлено после добавления items
        items_total_cents: 0,
        tax_cents: 0,
        delivery_fee_cents: deliveryFee,
        is_test: i <= 5,
        order_type: orderType,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        expected_at: i % 2 === 1 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
        channel: ['web', 'app', 'partner'][i % 3],
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_comment: comment,
        delivery_address: orderType === 'delivery' ? {
          street: `ул. Пушкина, д. ${i % 20 + 1}`,
          city: 'Москва',
          zip: '100000',
          apt: `${i % 100 + 1}`,
          lat: 55.7558 + (i % 10) * 0.001,
          lon: 37.6176 + (i % 10) * 0.001
        } : null,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      testOrders.push(order);
    }

    // Вставляем заказы
    const { data: insertedOrders, error: ordersError } = await supabase
      .from("orders")
      .insert(testOrders)
      .select("id");

    if (ordersError) {
      console.error("Orders insert error:", ordersError);
      return { ok: false, error: ordersError.message };
    }

    console.log("Orders created:", insertedOrders?.length);

    // Создаем order_items для каждого заказа
    const { data: menuItems, error: menuItemsError } = await supabase
      .from("menu_items")
      .select("id, price_cents, name")
      .eq("tenant_id", tenant.id)
      .limit(8);

    if (menuItemsError) {
      console.error("Menu items error:", menuItemsError);
      return { ok: false, error: menuItemsError.message };
    }

    if (!menuItems || menuItems.length === 0) {
      return { ok: false, error: "No menu items found" };
    }

    const orderItems = [];
    for (const order of insertedOrders || []) {
      const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items
      let orderTotal = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const subtotal = menuItem.price_cents * qty;
        orderTotal += subtotal;
        
        orderItems.push({
          tenant_id: tenant.id,
          order_id: order.id,
          item_id: menuItem.id,
          item_name: menuItem.name || "Unknown Item",
          qty,
          unit_price_cents: menuItem.price_cents,
          subtotal_cents: subtotal,
          modifiers: []
        });
      }
      
      // Обновляем total_cents заказа
      await supabase
        .from("orders")
        .update({ 
          total_cents: orderTotal + 200, // Примерная доставка
          items_total_cents: orderTotal
        })
        .eq("id", order.id);
    }

    // Вставляем order_items
    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Order items error:", itemsError);
        return { ok: false, error: itemsError.message };
      }
    }

    console.log("Test data created successfully");

    return { ok: true };
  } catch (error) {
    console.error("Seed error:", error);
    return { ok: false, error: "Failed to seed test data. Please try again." };
  }
}
