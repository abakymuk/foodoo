"use server";

import { createClient } from "@/lib/auth/server";
import type { 
  Location, 
  CreateLocationData, 
  UpdateLocationData,
  LocationId,
  LocationBrandView,
  AttachBrandToLocationData,
  DetachBrandFromLocationData
} from "@/types/multibrand";

export async function getLocations() {
  const supabase = await createClient();
  
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

    // Получаем локации для этого tenant
    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("name");

    if (locationsError) {
      return { ok: false, error: locationsError.message, data: null };
    }

    return { ok: true, data: locations || [] };
  } catch (error) {
    console.error("Get locations error:", error);
    return { ok: false, error: "Failed to get locations. Please try again.", data: null };
  }
}

export async function getLocationById(locationId: LocationId) {
  const supabase = await createClient();
  
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

    // Получаем локацию
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .eq("tenant_id", tenant.id)
      .single();

    if (locationError) {
      return { ok: false, error: locationError.message, data: null };
    }

    if (!location) {
      return { ok: false, error: "Location not found", data: null };
    }

    return { ok: true, data: location };
  } catch (error) {
    console.error("Get location by ID error:", error);
    return { ok: false, error: "Failed to get location. Please try again.", data: null };
  }
}

export async function createLocation(locationData: CreateLocationData) {
  const supabase = await createClient();
  
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

    // Создаем локацию
    const { data: location, error: createError } = await supabase
      .from("locations")
      .insert({
        tenant_id: tenant.id,
        name: locationData.name,
        address: locationData.address,
        tz: locationData.tz,
        status: locationData.status || 'active',
      })
      .select()
      .single();

    if (createError) {
      return { ok: false, error: createError.message };
    }

    return { ok: true, data: location };
  } catch (error) {
    console.error("Create location error:", error);
    return { ok: false, error: "Failed to create location. Please try again." };
  }
}

export async function updateLocation(locationId: LocationId, locationData: UpdateLocationData) {
  const supabase = await createClient();
  
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

    // Проверяем, что локация принадлежит этому tenant
    const { data: existingLocation, error: checkError } = await supabase
      .from("locations")
      .select("id")
      .eq("id", locationId)
      .eq("tenant_id", tenant.id)
      .single();

    if (checkError || !existingLocation) {
      return { ok: false, error: "Location not found" };
    }

    // Обновляем локацию
    const { data: location, error: updateError } = await supabase
      .from("locations")
      .update(locationData)
      .eq("id", locationId)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true, data: location };
  } catch (error) {
    console.error("Update location error:", error);
    return { ok: false, error: "Failed to update location. Please try again." };
  }
}

export async function deleteLocation(locationId: LocationId) {
  const supabase = await createClient();
  
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

    // Удаляем локацию (каскадом удалятся связи в location_brands)
    const { error: deleteError } = await supabase
      .from("locations")
      .delete()
      .eq("id", locationId)
      .eq("tenant_id", tenant.id);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Delete location error:", error);
    return { ok: false, error: "Failed to delete location. Please try again." };
  }
}

export async function getLocationBrands() {
  const supabase = await createClient();
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not authenticated", data: null };
  }

  try {
    // Получаем связи локаций и брендов через VIEW
    const { data: locationBrands, error: viewError } = await supabase
      .from("v_location_brands")
      .select("*")
      .order("location_name, brand_name");

    if (viewError) {
      return { ok: false, error: viewError.message, data: null };
    }

    return { ok: true, data: locationBrands || [] };
  } catch (error) {
    console.error("Get location brands error:", error);
    return { ok: false, error: "Failed to get location brands. Please try again.", data: null };
  }
}

export async function attachBrandToLocation(data: AttachBrandToLocationData) {
  const supabase = await createClient();
  
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

    // Проверяем, что локация и бренд принадлежат этому tenant
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id")
      .eq("id", data.location_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (locationError || !location) {
      return { ok: false, error: "Location not found" };
    }

    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", data.brand_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (brandError || !brand) {
      return { ok: false, error: "Brand not found" };
    }

    // Создаем связь
    const { data: link, error: linkError } = await supabase
      .from("location_brands")
      .insert({
        location_id: data.location_id,
        brand_id: data.brand_id,
        status: data.status || 'active',
      })
      .select()
      .single();

    if (linkError) {
      return { ok: false, error: linkError.message };
    }

    return { ok: true, data: link };
  } catch (error) {
    console.error("Attach brand to location error:", error);
    return { ok: false, error: "Failed to attach brand to location. Please try again." };
  }
}

export async function detachBrandFromLocation(data: DetachBrandFromLocationData) {
  const supabase = await createClient();
  
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

    // Проверяем, что локация и бренд принадлежат этому tenant
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id")
      .eq("id", data.location_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (locationError || !location) {
      return { ok: false, error: "Location not found" };
    }

    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", data.brand_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (brandError || !brand) {
      return { ok: false, error: "Brand not found" };
    }

    // Удаляем связь
    const { error: deleteError } = await supabase
      .from("location_brands")
      .delete()
      .eq("location_id", data.location_id)
      .eq("brand_id", data.brand_id);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Detach brand from location error:", error);
    return { ok: false, error: "Failed to detach brand from location. Please try again." };
  }
}
