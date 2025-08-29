"use server";

import { createClient } from "@/lib/auth/server";

export async function getSettings() {
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
      .select("id, brand_name, currency")
      .eq("owner_user_id", user.id)
      .single();

    if (tenantError || !tenant) {
      return { ok: false, error: "Tenant not found", data: null };
    }

    // Получаем первую локацию
    const { data: location } = await supabase
      .from("locations")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    return { 
      ok: true, 
      data: {
        tenant: {
          id: tenant.id,
          brand_name: tenant.brand_name || "",
          currency: tenant.currency || "EUR",
        },
        location: location ? {
          id: location.id,
          name: location.name,
        } : null,
      }
    };
  } catch (error) {
    console.error("Get settings error:", error);
    return { ok: false, error: "Failed to get settings. Please try again.", data: null };
  }
}

export async function updateSettings(data: {
  brand_name: string;
  currency: "EUR" | "USD";
  location_name: string;
}) {
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

    // Обновляем tenant
    const { error: tenantUpdateError } = await supabase
      .from("tenants")
      .update({
        brand_name: data.brand_name,
        currency: data.currency,
      })
      .eq("id", tenant.id);

    if (tenantUpdateError) {
      return { ok: false, error: tenantUpdateError.message };
    }

    // Получаем первую локацию
    const { data: location } = await supabase
      .from("locations")
      .select("id")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (location) {
      // Обновляем локацию
      const { error: locationUpdateError } = await supabase
        .from("locations")
        .update({
          name: data.location_name,
        })
        .eq("id", location.id);

      if (locationUpdateError) {
        return { ok: false, error: locationUpdateError.message };
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("Update settings error:", error);
    return { ok: false, error: "Failed to update settings. Please try again." };
  }
}
