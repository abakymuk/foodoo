"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/auth/server";
import type { 
  Category, 
  CategoryWithI18n,
  CreateCategoryData, 
  UpdateCategoryData,
  CategoryId,
  GetCategoriesParams
} from "@/types/catalog";

export async function getCategories(params: GetCategoriesParams = {}) {
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

    // Строим запрос для категорий
    let query = supabase
      .from("categories")
      .select(`
        *,
        category_i18n(*)
      `)
      .eq("tenant_id", tenant.id)
      .order("sort", { ascending: true });

    // Применяем фильтры
    if (params.brand_id) {
      query = query.eq("brand_id", params.brand_id);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }

    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      return { ok: false, error: categoriesError.message, data: null };
    }

    // Фильтруем i18n по локали, если указана
    let result = categories || [];
    if (params.locale) {
      result = result.map(category => ({
        ...category,
        category_i18n: category.category_i18n?.filter((i18n: any) => i18n.locale === params.locale) || []
      }));
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error("Get categories error:", error);
    return { ok: false, error: "Failed to get categories. Please try again.", data: null };
  }
}

export async function getCategoryById(categoryId: CategoryId, locale?: string) {
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

    // Строим запрос
    const query = supabase
      .from("categories")
      .select(`
        *,
        category_i18n(*)
      `)
      .eq("id", categoryId)
      .eq("tenant_id", tenant.id)
      .single();

    const { data: category, error: categoryError } = await query;

    if (categoryError) {
      return { ok: false, error: categoryError.message, data: null };
    }

    if (!category) {
      return { ok: false, error: "Category not found", data: null };
    }

    // Фильтруем i18n по локали, если указана
    if (locale) {
      category.category_i18n = category.category_i18n?.filter((i18n: any) => i18n.locale === locale) || [];
    }

    return { ok: true, data: category };
  } catch (error) {
    console.error("Get category by ID error:", error);
    return { ok: false, error: "Failed to get category. Please try again.", data: null };
  }
}

export async function createCategory(categoryData: CreateCategoryData) {
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

    // Проверяем уникальность code
    const { data: existingCategory, error: checkError } = await supabase
      .from("categories")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("code", categoryData.code)
      .eq("brand_id", categoryData.brand_id || null)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { ok: false, error: checkError.message };
    }

    if (existingCategory) {
      return { ok: false, error: "Category with this code already exists" };
    }

    // Создаем категорию
    const { data: category, error: createError } = await supabase
      .from("categories")
      .insert({
        tenant_id: tenant.id,
        brand_id: categoryData.brand_id,
        code: categoryData.code,
        sort: categoryData.sort || 100,
        status: categoryData.status || 'active',
      })
      .select()
      .single();

    if (createError) {
      return { ok: false, error: createError.message };
    }

    // Создаем i18n записи
    if (categoryData.i18n && categoryData.i18n.length > 0) {
      const i18nData = categoryData.i18n.map(i18n => ({
        category_id: category.id,
        locale: i18n.locale,
        title: i18n.title,
        description: i18n.description,
      }));

      const { error: i18nError } = await supabase
        .from("category_i18n")
        .insert(i18nData);

      if (i18nError) {
        return { ok: false, error: i18nError.message };
      }
    }

    return { ok: true, data: category };
  } catch (error) {
    console.error("Create category error:", error);
    return { ok: false, error: "Failed to create category. Please try again." };
  }
}

export async function updateCategory(categoryId: CategoryId, categoryData: UpdateCategoryData) {
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

    // Проверяем, что категория принадлежит этому tenant
    const { data: existingCategory, error: checkError } = await supabase
      .from("categories")
      .select("id, code, brand_id")
      .eq("id", categoryId)
      .eq("tenant_id", tenant.id)
      .single();

    if (checkError || !existingCategory) {
      return { ok: false, error: "Category not found" };
    }

    // Если изменяется code, проверяем уникальность
    if (categoryData.code && categoryData.code !== existingCategory.code) {
      const { data: duplicateCategory, error: duplicateError } = await supabase
        .from("categories")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("code", categoryData.code)
        .eq("brand_id", categoryData.brand_id || existingCategory.brand_id)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        return { ok: false, error: duplicateError.message };
      }

      if (duplicateCategory) {
        return { ok: false, error: "Category with this code already exists" };
      }
    }

    // Обновляем категорию
    const updateData: Record<string, unknown> = {};
    if (categoryData.brand_id !== undefined) updateData.brand_id = categoryData.brand_id;
    if (categoryData.code) updateData.code = categoryData.code;
    if (categoryData.sort !== undefined) updateData.sort = categoryData.sort;
    if (categoryData.status) updateData.status = categoryData.status;

    const { data: category, error: updateError } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", categoryId)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    // Обновляем i18n записи
    if (categoryData.i18n) {
      // Удаляем существующие i18n записи
      await supabase
        .from("category_i18n")
        .delete()
        .eq("category_id", categoryId);

      // Создаем новые i18n записи
      if (categoryData.i18n.length > 0) {
        const i18nData = categoryData.i18n.map(i18n => ({
          category_id: categoryId,
          locale: i18n.locale,
          title: i18n.title,
          description: i18n.description,
        }));

        const { error: i18nError } = await supabase
          .from("category_i18n")
          .insert(i18nData);

        if (i18nError) {
          return { ok: false, error: i18nError.message };
        }
      }
    }

    return { ok: true, data: category };
  } catch (error) {
    console.error("Update category error:", error);
    return { ok: false, error: "Failed to update category. Please try again." };
  }
}

export async function deleteCategory(categoryId: CategoryId) {
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

    // Удаляем категорию (каскадом удалятся i18n и category_items)
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("tenant_id", tenant.id);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Delete category error:", error);
    return { ok: false, error: "Failed to delete category. Please try again." };
  }
}
