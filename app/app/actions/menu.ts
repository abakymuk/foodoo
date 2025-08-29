"use server";

import { createClient } from "@/lib/auth/server";

export async function createSampleMenu() {
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

    // Создаем 3 sample позиции
    const sampleItems = [
      { name: "Burger", price_cents: 999 },
      { name: "Fries", price_cents: 349 },
      { name: "Cola", price_cents: 199 },
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

    return { ok: true };
  } catch (error) {
    console.error("Create sample menu error:", error);
    return { ok: false, error: "Failed to create sample menu. Please try again." };
  }
}

export async function getMenuItems() {
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

    // Получаем menu items
    const { data: menuItems, error: itemsError } = await supabase
      .from("menu_items")
      .select("id, name, price_cents, is_active")
      .eq("tenant_id", tenant.id)
      .order("name");

    if (itemsError) {
      return { ok: false, error: itemsError.message, data: null };
    }

    return { ok: true, data: menuItems };
  } catch (error) {
    console.error("Get menu items error:", error);
    return { ok: false, error: "Failed to get menu items. Please try again.", data: null };
  }
}
