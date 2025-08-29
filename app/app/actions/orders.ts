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
        status: "paid_test",
        total_cents: 100,
        is_test: true,
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

export async function getOrders() {
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

    // Получаем заказы
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, status, total_cents, is_test, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      return { ok: false, error: ordersError.message, data: null };
    }

    return { ok: true, data: orders };
  } catch (error) {
    console.error("Get orders error:", error);
    return { ok: false, error: "Failed to get orders. Please try again.", data: null };
  }
}
