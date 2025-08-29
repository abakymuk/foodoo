"use server";

import { createClient } from "@/lib/auth/server";

type QuickstartData = {
  brand: string;
  location: string;
  currency: "EUR" | "USD";
};

export async function completeQuickstart(data: QuickstartData) {
  console.log("Server action called with data:", data);
  
  const supabase = await createClient();
  
  // Получаем текущего пользователя
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("Auth check result:", { user: !!user, authError });

  if (authError || !user) {
    console.log("Authentication failed");
    return { ok: false, error: "Not authenticated" };
  }

  try {
    // Проверяем, есть ли уже tenant у пользователя
    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    let tenantId: string;

    if (existingTenant) {
      tenantId = existingTenant.id;
    } else {
      // Создаем новый tenant
      const { data: newTenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          owner_user_id: user.id,
          brand_name: data.brand,
          currency: data.currency,
          onboarding_completed: false,
        })
        .select("id")
        .single();

      if (tenantError) {
        return { ok: false, error: tenantError.message };
      }

      tenantId = newTenant.id;
    }

    // Создаем location
    const { error: locationError } = await supabase
      .from("locations")
      .insert({
        tenant_id: tenantId,
        name: data.location,
      });

    if (locationError) {
      return { ok: false, error: locationError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Quickstart error:", error);
    return { ok: false, error: "Failed to complete setup. Please try again." };
  }
}
