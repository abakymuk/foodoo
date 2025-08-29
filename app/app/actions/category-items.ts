"use server";

import { createClient } from "@/lib/auth/server";
import type { 
  CategoryItem,
  CreateCategoryItemData,
  UpdateCategoryItemData,
  CategoryId,
  ItemId
} from "@/types/catalog";

export async function getCategoryItems(categoryId?: CategoryId, itemId?: ItemId) {
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
    let query = supabase
      .from("category_items")
      .select(`
        *,
        categories!inner(*),
        items!inner(*)
      `);

    // Применяем фильтры
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }
    if (itemId) {
      query = query.eq("item_id", itemId);
    }

    // Добавляем фильтр по tenant через JOIN
    query = query.eq("categories.tenant_id", tenant.id);

    const { data: categoryItems, error: categoryItemsError } = await query;

    if (categoryItemsError) {
      return { ok: false, error: categoryItemsError.message, data: null };
    }

    return { ok: true, data: categoryItems || [] };
  } catch (error) {
    console.error("Get category items error:", error);
    return { ok: false, error: "Failed to get category items. Please try again.", data: null };
  }
}

export async function createCategoryItem(data: CreateCategoryItemData) {
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

    // Проверяем, что категория и позиция принадлежат этому tenant
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", data.category_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (categoryError || !category) {
      return { ok: false, error: "Category not found" };
    }

    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id")
      .eq("id", data.item_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (itemError || !item) {
      return { ok: false, error: "Item not found" };
    }

    // Проверяем, что связь еще не существует
    const { data: existingLink, error: checkError } = await supabase
      .from("category_items")
      .select("category_id")
      .eq("category_id", data.category_id)
      .eq("item_id", data.item_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { ok: false, error: checkError.message };
    }

    if (existingLink) {
      return { ok: false, error: "Item is already linked to this category" };
    }

    // Создаем связь
    const { data: categoryItem, error: createError } = await supabase
      .from("category_items")
      .insert({
        category_id: data.category_id,
        item_id: data.item_id,
        sort: data.sort || 100,
      })
      .select()
      .single();

    if (createError) {
      return { ok: false, error: createError.message };
    }

    return { ok: true, data: categoryItem };
  } catch (error) {
    console.error("Create category item error:", error);
    return { ok: false, error: "Failed to create category item. Please try again." };
  }
}

export async function updateCategoryItem(categoryId: CategoryId, itemId: ItemId, data: UpdateCategoryItemData) {
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

    // Проверяем, что связь существует и принадлежит этому tenant
    const { data: existingLink, error: checkError } = await supabase
      .from("category_items")
      .select("category_id, item_id")
      .eq("category_id", categoryId)
      .eq("item_id", itemId)
      .single();

    if (checkError || !existingLink) {
      return { ok: false, error: "Category item link not found" };
    }

    // Проверяем, что категория принадлежит этому tenant
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("tenant_id", tenant.id)
      .single();

    if (categoryError || !category) {
      return { ok: false, error: "Category not found" };
    }

    // Обновляем связь
    const updateData: Record<string, unknown> = {};
    if (data.sort !== undefined) updateData.sort = data.sort;

    const { data: categoryItem, error: updateError } = await supabase
      .from("category_items")
      .update(updateData)
      .eq("category_id", categoryId)
      .eq("item_id", itemId)
      .select()
      .single();

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true, data: categoryItem };
  } catch (error) {
    console.error("Update category item error:", error);
    return { ok: false, error: "Failed to update category item. Please try again." };
  }
}

export async function deleteCategoryItem(categoryId: CategoryId, itemId: ItemId) {
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
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("tenant_id", tenant.id)
      .single();

    if (categoryError || !category) {
      return { ok: false, error: "Category not found" };
    }

    // Удаляем связь
    const { error: deleteError } = await supabase
      .from("category_items")
      .delete()
      .eq("category_id", categoryId)
      .eq("item_id", itemId);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Delete category item error:", error);
    return { ok: false, error: "Failed to delete category item. Please try again." };
  }
}
