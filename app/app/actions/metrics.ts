"use server";

import { createClient } from "@/lib/auth/server";

export async function getDashboardMetrics() {
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

    // Получаем заказы за сегодня (прямой запрос в Postgres)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayOrders, error: ordersError } = await supabase
      .from("orders")
      .select("id")
      .eq("tenant_id", tenant.id)
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString());

    if (ordersError) {
      return { ok: false, error: ordersError.message, data: null };
    }

    return { 
      ok: true, 
      data: {
        todayOrders: todayOrders?.length || 0,
      }
    };
  } catch (error) {
    console.error("Get metrics error:", error);
    return { ok: false, error: "Failed to get metrics. Please try again.", data: null };
  }
}
