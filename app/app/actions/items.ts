"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/auth/server";
import type { 
  Item, 
  ItemWithDetails,
  CreateItemData, 
  UpdateItemData,
  ItemId,
  GetItemsParams
} from "@/types/catalog";

export async function getItems(params: GetItemsParams = {}) {
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

    // Строим запрос для позиций
    let query = supabase
      .from("items")
      .select(`
        *,
        item_i18n(*),
        item_media(*),
        item_variants(*)
      `)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    // Применяем фильтры
    if (params.status) {
      query = query.eq("status", params.status);
    }
    if (params.product_type) {
      query = query.eq("product_type", params.product_type);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) {
      return { ok: false, error: itemsError.message, data: null };
    }

    // Фильтруем i18n по локали, если указана
    let result = items || [];
    if (params.locale) {
      result = result.map(item => ({
        ...item,
        item_i18n: item.item_i18n?.filter((i18n: any) => i18n.locale === params.locale) || []
      }));
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error("Get items error:", error);
    return { ok: false, error: "Failed to get items. Please try again.", data: null };
  }
}

export async function getItemById(itemId: ItemId, locale?: string) {
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
      .from("items")
      .select(`
        *,
        item_i18n(*),
        item_media(*),
        item_variants(*)
      `)
      .eq("id", itemId)
      .eq("tenant_id", tenant.id)
      .single();

    const { data: item, error: itemError } = await query;

    if (itemError) {
      return { ok: false, error: itemError.message, data: null };
    }

    if (!item) {
      return { ok: false, error: "Item not found", data: null };
    }

    // Фильтруем i18n по локали, если указана
    if (locale) {
      item.item_i18n = item.item_i18n?.filter((i18n: any) => i18n.locale === locale) || [];
    }

    return { ok: true, data: item };
  } catch (error) {
    console.error("Get item by ID error:", error);
    return { ok: false, error: "Failed to get item. Please try again.", data: null };
  }
}

export async function createItem(itemData: CreateItemData) {
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

    // Проверяем уникальность base_sku
    const { data: existingItem, error: checkError } = await supabase
      .from("items")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("base_sku", itemData.base_sku)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { ok: false, error: checkError.message };
    }

    if (existingItem) {
      return { ok: false, error: "Item with this SKU already exists" };
    }

    // Валидация вариантов
    if (itemData.product_type === 'variant') {
      if (!itemData.variants || itemData.variants.length === 0) {
        return { ok: false, error: "Variant items must have at least one variant" };
      }
      
      const defaultVariants = itemData.variants.filter(v => v.is_default);
      if (defaultVariants.length !== 1) {
        return { ok: false, error: "Variant items must have exactly one default variant" };
      }
    }

    // Создаем позицию
    const { data: item, error: createError } = await supabase
      .from("items")
      .insert({
        tenant_id: tenant.id,
        base_sku: itemData.base_sku,
        product_type: itemData.product_type,
        status: itemData.status || 'active',
        allergen_mask: itemData.allergen_mask || 0,
        kds_station: itemData.kds_station,
        print_profile: itemData.print_profile,
      })
      .select()
      .single();

    if (createError) {
      return { ok: false, error: createError.message };
    }

    // Создаем i18n записи
    if (itemData.i18n && itemData.i18n.length > 0) {
      const i18nData = itemData.i18n.map(i18n => ({
        item_id: item.id,
        locale: i18n.locale,
        title: i18n.title,
        description: i18n.description,
        seo_meta: i18n.seo_meta,
      }));

      const { error: i18nError } = await supabase
        .from("item_i18n")
        .insert(i18nData);

      if (i18nError) {
        return { ok: false, error: i18nError.message };
      }
    }

    // Создаем медиа записи
    if (itemData.media && itemData.media.length > 0) {
      const mediaData = itemData.media.map(media => ({
        item_id: item.id,
        kind: media.kind,
        url: media.url,
        alt: media.alt,
        aspect_ratio: media.aspect_ratio,
      }));

      const { error: mediaError } = await supabase
        .from("item_media")
        .insert(mediaData);

      if (mediaError) {
        return { ok: false, error: mediaError.message };
      }
    }

    // Создаем варианты
    if (itemData.variants && itemData.variants.length > 0) {
      const variantsData = itemData.variants.map(variant => ({
        item_id: item.id,
        variant_sku: variant.variant_sku,
        is_default: variant.is_default || false,
        size: variant.size,
        weight: variant.weight,
        volume: variant.volume,
        barcode: variant.barcode,
      }));

      const { error: variantsError } = await supabase
        .from("item_variants")
        .insert(variantsData);

      if (variantsError) {
        return { ok: false, error: variantsError.message };
      }
    }

    return { ok: true, data: item };
  } catch (error) {
    console.error("Create item error:", error);
    return { ok: false, error: "Failed to create item. Please try again." };
  }
}

export async function updateItem(itemId: ItemId, itemData: UpdateItemData) {
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

    // Проверяем, что позиция принадлежит этому tenant
    const { data: existingItem, error: checkError } = await supabase
      .from("items")
      .select("id, base_sku, product_type")
      .eq("id", itemId)
      .eq("tenant_id", tenant.id)
      .single();

    if (checkError || !existingItem) {
      return { ok: false, error: "Item not found" };
    }

    // Если изменяется base_sku, проверяем уникальность
    if (itemData.base_sku && itemData.base_sku !== existingItem.base_sku) {
      const { data: duplicateItem, error: duplicateError } = await supabase
        .from("items")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("base_sku", itemData.base_sku)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        return { ok: false, error: duplicateError.message };
      }

      if (duplicateItem) {
        return { ok: false, error: "Item with this SKU already exists" };
      }
    }

    // Валидация вариантов
    if (itemData.product_type === 'variant' || existingItem.product_type === 'variant') {
      if (itemData.variants) {
        if (itemData.variants.length === 0) {
          return { ok: false, error: "Variant items must have at least one variant" };
        }
        
        const defaultVariants = itemData.variants.filter(v => v.is_default);
        if (defaultVariants.length !== 1) {
          return { ok: false, error: "Variant items must have exactly one default variant" };
        }
      }
    }

    // Обновляем позицию
    const updateData: Record<string, unknown> = {};
    if (itemData.base_sku) updateData.base_sku = itemData.base_sku;
    if (itemData.product_type) updateData.product_type = itemData.product_type;
    if (itemData.status) updateData.status = itemData.status;
    if (itemData.allergen_mask !== undefined) updateData.allergen_mask = itemData.allergen_mask;
    if (itemData.kds_station !== undefined) updateData.kds_station = itemData.kds_station;
    if (itemData.print_profile !== undefined) updateData.print_profile = itemData.print_profile;

    const { data: item, error: updateError } = await supabase
      .from("items")
      .update(updateData)
      .eq("id", itemId)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    // Обновляем i18n записи
    if (itemData.i18n) {
      await supabase
        .from("item_i18n")
        .delete()
        .eq("item_id", itemId);

      if (itemData.i18n.length > 0) {
        const i18nData = itemData.i18n.map(i18n => ({
          item_id: itemId,
          locale: i18n.locale,
          title: i18n.title,
          description: i18n.description,
          seo_meta: i18n.seo_meta,
        }));

        const { error: i18nError } = await supabase
          .from("item_i18n")
          .insert(i18nData);

        if (i18nError) {
          return { ok: false, error: i18nError.message };
        }
      }
    }

    // Обновляем медиа записи
    if (itemData.media) {
      await supabase
        .from("item_media")
        .delete()
        .eq("item_id", itemId);

      if (itemData.media.length > 0) {
        const mediaData = itemData.media.map(media => ({
          item_id: itemId,
          kind: media.kind,
          url: media.url,
          alt: media.alt,
          aspect_ratio: media.aspect_ratio,
        }));

        const { error: mediaError } = await supabase
          .from("item_media")
          .insert(mediaData);

        if (mediaError) {
          return { ok: false, error: mediaError.message };
        }
      }
    }

    // Обновляем варианты
    if (itemData.variants) {
      await supabase
        .from("item_variants")
        .delete()
        .eq("item_id", itemId);

      if (itemData.variants.length > 0) {
        const variantsData = itemData.variants.map(variant => ({
          item_id: itemId,
          variant_sku: variant.variant_sku,
          is_default: variant.is_default || false,
          size: variant.size,
          weight: variant.weight,
          volume: variant.volume,
          barcode: variant.barcode,
        }));

        const { error: variantsError } = await supabase
          .from("item_variants")
          .insert(variantsData);

        if (variantsError) {
          return { ok: false, error: variantsError.message };
        }
      }
    }

    return { ok: true, data: item };
  } catch (error) {
    console.error("Update item error:", error);
    return { ok: false, error: "Failed to update item. Please try again." };
  }
}

export async function deleteItem(itemId: ItemId) {
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

    // Удаляем позицию (каскадом удалятся i18n, media, variants и category_items)
    const { error: deleteError } = await supabase
      .from("items")
      .delete()
      .eq("id", itemId)
      .eq("tenant_id", tenant.id);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Delete item error:", error);
    return { ok: false, error: "Failed to delete item. Please try again." };
  }
}
