"use server";

import { createClient } from "@/lib/auth/server";

export async function placeTestOrder() {
  const supabase = await createClient();
  
  // Получаем текущего пользователя
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    // Получаем tenant пользователя
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (tenantError || !tenant) {
      return { ok: false, error: "Tenant not found" };
    }

    // Создаем тестовый заказ
    const { error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenant.id,
        status: "completed",
        total_cents: 100,
        items_total_cents: 100,
        tax_cents: 0,
        delivery_fee_cents: 0,
        is_test: true,
        order_type: "pickup",
        payment_method: "card",
        payment_status: "paid",
        channel: "web",
        customer_name: "Test Customer",
        customer_phone: "+79001234567",
      });

    if (orderError) {
      return { ok: false, error: orderError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Place test order error:", error);
    return { ok: false, error: "Failed to place test order. Please try again." };
  }
}

type GetOrdersParams = {
  status?: string;
  type?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function getOrders(params: GetOrdersParams = {}) {
  const supabase = await createClient();
  
  // Получаем текущего пользователя
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not authenticated", data: null };
  }

  try {
    // Получаем tenant пользователя
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (tenantError || !tenant) {
      return { ok: false, error: "Tenant not found", data: null };
    }

    // Начинаем построение запроса
    let query = supabase
      .from("orders")
      .select(`
        id, 
        order_number, 
        status, 
        total_cents, 
        is_test, 
        order_type, 
        payment_method, 
        payment_status, 
        customer_name, 
        customer_phone, 
        customer_comment, 
        delivery_address, 
        expected_at,
        assignee_user_id,
        courier_name,
        courier_phone,
        created_at,
        order_items (
          id,
          item_name,
          qty,
          unit_price_cents
        )
      `)
      .eq("tenant_id", tenant.id);

    // Применяем фильтры
    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params.type && params.type !== "all") {
      query = query.eq("order_type", params.type);
    }

    if (params.q) {
      query = query.or(`
        order_number.ilike.%${params.q}%,
        customer_name.ilike.%${params.q}%,
        customer_phone.ilike.%${params.q}%
      `);
    }

    if (params.from) {
      query = query.gte("created_at", params.from);
    }

    if (params.to) {
      query = query.lte("created_at", params.to);
    }

    // Получаем общее количество для пагинации
    const { count } = await query;

    // Применяем пагинацию
    const page = params.page || 1;
    const pageSize = params.pageSize || 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to).order("created_at", { ascending: false });

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      return { ok: false, error: ordersError.message, data: null };
    }

    return { 
      ok: true, 
      data: {
        orders: orders || [],
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize)
        }
      }
    };
  } catch (error) {
    console.error("Get orders error:", error);
    return { ok: false, error: "Failed to get orders. Please try again.", data: null };
  }
}

export async function getOrderById(orderId: string) {
  const supabase = await createClient();
  
  // Получаем текущего пользователя
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not authenticated", data: null };
  }

  try {
    // Получаем tenant пользователя
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (tenantError || !tenant) {
      return { ok: false, error: "Tenant not found", data: null };
    }

    // Получаем заказ с полной информацией
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id, 
        order_number, 
        status, 
        total_cents,
        items_total_cents,
        tax_cents,
        service_fee_cents,
        delivery_fee_cents,
        discount_cents,
        is_test, 
        order_type, 
        payment_method, 
        payment_status, 
        customer_name, 
        customer_phone, 
        customer_comment, 
        delivery_address, 
        expected_at,
        assignee_user_id,
        courier_name,
        courier_phone,
        channel,
        created_at,
        order_items (
          id,
          item_id,
          item_name,
          qty,
          unit_price_cents,
          modifiers,
          subtotal_cents
        ),
        payments (
          id,
          provider,
          provider_ref,
          amount_cents,
          status,
          is_test,
          created_at
        )
      `)
      .eq("tenant_id", tenant.id)
      .eq("id", orderId)
      .single();

    if (orderError) {
      return { ok: false, error: orderError.message, data: null };
    }

    if (!order) {
      return { ok: false, error: "Order not found", data: null };
    }

    return { ok: true, data: order };
  } catch (error) {
    console.error("Get order by ID error:", error);
    return { ok: false, error: "Failed to get order. Please try again.", data: null };
  }
}

type UpdateOrderParams = {
  status?: string;
  expected_at?: string;
  assignee_user_id?: string;
  courier_name?: string;
  courier_phone?: string;
  payment_status?: string;
};

export async function updateOrder(orderId: string, updates: UpdateOrderParams) {
  const supabase = await createClient();
  
  // Получаем текущего пользователя
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    // Получаем tenant пользователя
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (tenantError || !tenant) {
      return { ok: false, error: "Tenant not found" };
    }

    // Получаем текущий заказ для проверки правил перехода
    const { data: existingOrder, error: checkError } = await supabase
      .from("orders")
      .select("id, status, order_type, payment_method, payment_status")
      .eq("tenant_id", tenant.id)
      .eq("id", orderId)
      .single();

    if (checkError || !existingOrder) {
      return { ok: false, error: "Order not found" };
    }

    // Проверяем правила перехода статусов
    if (updates.status && updates.status !== existingOrder.status) {
      const isValidTransition = validateStatusTransition(
        existingOrder.status,
        updates.status,
        existingOrder.order_type
      );

      if (!isValidTransition) {
        return { 
          ok: false, 
          error: `Invalid status transition from ${existingOrder.status} to ${updates.status}` 
        };
      }

      // Автоматически обновляем payment_status при завершении заказа
      if (updates.status === "completed") {
        if (existingOrder.payment_method === "cash") {
          // Для наличных оставляем текущий статус (нужен ручной чекбокс)
          updates.payment_status = existingOrder.payment_status;
        } else {
          // Для онлайн платежей автоматически устанавливаем paid
          updates.payment_status = "paid";
        }
      }
    }

    // Обновляем заказ
    const { error: updateError } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .eq("tenant_id", tenant.id);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Update order error:", error);
    return { ok: false, error: "Failed to update order. Please try again." };
  }
}

// Функция для проверки правил перехода статусов
function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  orderType: string
): boolean {
  // Разрешенные переходы
  const allowedTransitions: Record<string, string[]> = {
    pending: ["accepted", "canceled"],
    accepted: ["in_progress", "canceled"],
    in_progress: ["ready", "en_route", "canceled"],
    ready: ["completed", "canceled"],
    en_route: ["completed", "canceled"],
    completed: [], // Завершенный заказ нельзя изменить
    canceled: [], // Отмененный заказ нельзя изменить
  };

  // Проверяем, разрешен ли переход
  const allowedNextStatuses = allowedTransitions[currentStatus] || [];
  if (!allowedNextStatuses.includes(newStatus)) {
    return false;
  }

  // Специальные правила для разных типов заказов
  if (newStatus === "ready" && orderType === "delivery") {
    return false; // Для доставки нет статуса "ready"
  }

  if (newStatus === "en_route" && orderType === "pickup") {
    return false; // Для самовывоза нет статуса "en_route"
  }

  return true;
}
