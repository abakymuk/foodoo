"use server";

import { createClient } from "@/lib/auth/server";
import type { 
  Brand, 
  CreateBrandData, 
  UpdateBrandData,
  BrandId 
} from "@/types/multibrand";

export async function getBrands() {
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

    // Получаем бренды для этого tenant
    const { data: brands, error: brandsError } = await supabase
      .from("brands")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("name");

    if (brandsError) {
      return { ok: false, error: brandsError.message, data: null };
    }

    return { ok: true, data: brands || [] };
  } catch (error) {
    console.error("Get brands error:", error);
    return { ok: false, error: "Failed to get brands. Please try again.", data: null };
  }
}

export async function getBrandById(brandId: BrandId) {
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

    // Получаем бренд
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .eq("tenant_id", tenant.id)
      .single();

    if (brandError) {
      return { ok: false, error: brandError.message, data: null };
    }

    if (!brand) {
      return { ok: false, error: "Brand not found", data: null };
    }

    return { ok: true, data: brand };
  } catch (error) {
    console.error("Get brand by ID error:", error);
    return { ok: false, error: "Failed to get brand. Please try again.", data: null };
  }
}

export async function createBrand(brandData: CreateBrandData) {
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

    // Проверяем уникальность slug в рамках tenant
    const { data: existingBrand, error: checkError } = await supabase
      .from("brands")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("slug", brandData.slug)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { ok: false, error: checkError.message };
    }

    if (existingBrand) {
      return { ok: false, error: "Brand with this slug already exists" };
    }

    // Создаем бренд
    const { data: brand, error: createError } = await supabase
      .from("brands")
      .insert({
        tenant_id: tenant.id,
        name: brandData.name,
        slug: brandData.slug,
        status: brandData.status || 'active',
      })
      .select()
      .single();

    if (createError) {
      return { ok: false, error: createError.message };
    }

    return { ok: true, data: brand };
  } catch (error) {
    console.error("Create brand error:", error);
    return { ok: false, error: "Failed to create brand. Please try again." };
  }
}

export async function updateBrand(brandId: BrandId, brandData: UpdateBrandData) {
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

    // Проверяем, что бренд принадлежит этому tenant
    const { data: existingBrand, error: checkError } = await supabase
      .from("brands")
      .select("id, slug")
      .eq("id", brandId)
      .eq("tenant_id", tenant.id)
      .single();

    if (checkError || !existingBrand) {
      return { ok: false, error: "Brand not found" };
    }

    // Если изменяется slug, проверяем уникальность
    if (brandData.slug && brandData.slug !== existingBrand.slug) {
      const { data: duplicateBrand, error: duplicateError } = await supabase
        .from("brands")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("slug", brandData.slug)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        return { ok: false, error: duplicateError.message };
      }

      if (duplicateBrand) {
        return { ok: false, error: "Brand with this slug already exists" };
      }
    }

    // Обновляем бренд
    const { data: brand, error: updateError } = await supabase
      .from("brands")
      .update(brandData)
      .eq("id", brandId)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true, data: brand };
  } catch (error) {
    console.error("Update brand error:", error);
    return { ok: false, error: "Failed to update brand. Please try again." };
  }
}

export async function deleteBrand(brandId: BrandId) {
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

    // Удаляем бренд (каскадом удалятся связи в location_brands)
    const { error: deleteError } = await supabase
      .from("brands")
      .delete()
      .eq("id", brandId)
      .eq("tenant_id", tenant.id);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Delete brand error:", error);
    return { ok: false, error: "Failed to delete brand. Please try again." };
  }
}
