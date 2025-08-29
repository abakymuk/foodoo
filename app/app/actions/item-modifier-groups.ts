"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/auth/server";
import type { 
  ItemModifierGroup, 
  ModifierGroupWithOverrides,
  CreateItemModifierGroupData, 
  UpdateItemModifierGroupData,
  ItemModifierGroupId,
  ModifierGroupId
} from "@/types/modifiers";

export async function getItemModifiers(itemId: string, locale?: string) {
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

    // Проверяем, что item принадлежит этому tenant
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id")
      .eq("id", itemId)
      .eq("tenant_id", tenant.id)
      .single();

    if (itemError || !item) {
      return { ok: false, error: "Item not found", data: null };
    }

    // Получаем привязки модификаторов к item
    const { data: itemModifierGroups, error: imgError } = await supabase
      .from("item_modifier_groups")
      .select(`
        *,
        modifier_groups(
          *,
          modifier_group_i18n(*),
          modifiers(
            *,
            modifier_i18n(*)
          )
        )
      `)
      .eq("item_id", itemId)
      .eq("tenant_id", tenant.id)
      .order("sort", { ascending: true });

    if (imgError) {
      return { ok: false, error: imgError.message, data: null };
    }

    // Получаем привязки модификаторов к вариантам этого item
    const { data: variantModifierGroups, error: vmgError } = await supabase
      .from("item_modifier_groups")
      .select(`
        *,
        item_variants!inner(
          id,
          variant_sku
        ),
        modifier_groups(
          *,
          modifier_group_i18n(*),
          modifiers(
            *,
            modifier_i18n(*)
          )
        )
      `)
      .eq("item_variants.item_id", itemId)
      .eq("tenant_id", tenant.id)
      .order("sort", { ascending: true });

    if (vmgError) {
      return { ok: false, error: vmgError.message, data: null };
    }

    // Объединяем и обрабатываем данные
    const result: ModifierGroupWithOverrides[] = [];

    // Обрабатываем item-level привязки
    for (const img of itemModifierGroups || []) {
      const group = img.modifier_groups;
      if (!group) continue;

      // Применяем оверрайды
      const appliedGroup: ModifierGroupWithOverrides = {
        ...group,
        applied_min: img.min ?? group.min,
        applied_max: img.max ?? group.max,
        applied_required: img.required ?? group.required,
        applied_exclusive: img.exclusive ?? group.exclusive,
        applied_display: img.display ?? group.display,
        default_selection: img.default_selection_json || [],
      };

      // Фильтруем i18n по локали, если указана
      if (locale) {
        appliedGroup.modifier_group_i18n = appliedGroup.modifier_group_i18n?.filter((i18n: any) => i18n.locale === locale) || [];
        
        if (appliedGroup.modifiers) {
          appliedGroup.modifiers = appliedGroup.modifiers.map((modifier: any) => ({
            ...modifier,
            modifier_i18n: modifier.modifier_i18n?.filter((i18n: any) => i18n.locale === locale) || []
          }));
        }
      }

      result.push(appliedGroup);
    }

    // Обрабатываем variant-level привязки (они переопределяют item-level)
    for (const vmg of variantModifierGroups || []) {
      const group = vmg.modifier_groups;
      if (!group) continue;

      // Находим существующую группу в результате
      const existingIndex = result.findIndex(g => g.id === group.id);
      
      if (existingIndex >= 0) {
        // Обновляем существующую группу с variant-level оверрайдами
        const existing = result[existingIndex];
        result[existingIndex] = {
          ...existing,
          applied_min: vmg.min ?? existing.applied_min,
          applied_max: vmg.max ?? existing.applied_max,
          applied_required: vmg.required ?? existing.applied_required,
          applied_exclusive: vmg.exclusive ?? existing.applied_exclusive,
          applied_display: vmg.display ?? existing.applied_display,
          default_selection: vmg.default_selection_json || existing.default_selection,
        };
      } else {
        // Добавляем новую группу с variant-level привязкой
        const appliedGroup: ModifierGroupWithOverrides = {
          ...group,
          applied_min: vmg.min ?? group.min,
          applied_max: vmg.max ?? group.max,
          applied_required: vmg.required ?? group.required,
          applied_exclusive: vmg.exclusive ?? group.exclusive,
          applied_display: vmg.display ?? group.display,
          default_selection: vmg.default_selection_json || [],
        };

        // Фильтруем i18n по локали, если указана
        if (locale) {
          appliedGroup.modifier_group_i18n = appliedGroup.modifier_group_i18n?.filter((i18n: any) => i18n.locale === locale) || [];
          
          if (appliedGroup.modifiers) {
            appliedGroup.modifiers = appliedGroup.modifiers.map((modifier: any) => ({
              ...modifier,
              modifier_i18n: modifier.modifier_i18n?.filter((i18n: any) => i18n.locale === locale) || []
            }));
          }
        }

        result.push(appliedGroup);
      }
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error("Get item modifiers error:", error);
    return { ok: false, error: "Failed to get item modifiers. Please try again.", data: null };
  }
}

export async function getVariantModifiers(variantId: string, locale?: string) {
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

    // Проверяем, что variant принадлежит этому tenant
    const { data: variant, error: variantError } = await supabase
      .from("item_variants")
      .select(`
        id,
        items!inner(
          id,
          tenant_id
        )
      `)
      .eq("id", variantId)
      .eq("items.tenant_id", tenant.id)
      .single();

    if (variantError || !variant) {
      return { ok: false, error: "Variant not found", data: null };
    }

    // Получаем привязки модификаторов к варианту
    const { data: variantModifierGroups, error: vmgError } = await supabase
      .from("item_modifier_groups")
      .select(`
        *,
        modifier_groups(
          *,
          modifier_group_i18n(*),
          modifiers(
            *,
            modifier_i18n(*)
          )
        )
      `)
      .eq("variant_id", variantId)
      .eq("tenant_id", tenant.id)
      .order("sort", { ascending: true });

    if (vmgError) {
      return { ok: false, error: vmgError.message, data: null };
    }

    // Обрабатываем данные
    const result: ModifierGroupWithOverrides[] = [];

    for (const vmg of variantModifierGroups || []) {
      const group = vmg.modifier_groups;
      if (!group) continue;

      // Применяем оверрайды
      const appliedGroup: ModifierGroupWithOverrides = {
        ...group,
        applied_min: vmg.min ?? group.min,
        applied_max: vmg.max ?? group.max,
        applied_required: vmg.required ?? group.required,
        applied_exclusive: vmg.exclusive ?? group.exclusive,
        applied_display: vmg.display ?? group.display,
        default_selection: vmg.default_selection_json || [],
      };

      // Фильтруем i18n по локали, если указана
      if (locale) {
        appliedGroup.modifier_group_i18n = appliedGroup.modifier_group_i18n?.filter((i18n: any) => i18n.locale === locale) || [];
        
        if (appliedGroup.modifiers) {
          appliedGroup.modifiers = appliedGroup.modifiers.map((modifier: any) => ({
            ...modifier,
            modifier_i18n: modifier.modifier_i18n?.filter((i18n: any) => i18n.locale === locale) || []
          }));
        }
      }

      result.push(appliedGroup);
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error("Get variant modifiers error:", error);
    return { ok: false, error: "Failed to get variant modifiers. Please try again.", data: null };
  }
}

export async function attachModifierGroupToItem(itemId: string, groupId: ModifierGroupId, data: CreateItemModifierGroupData) {
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

    // Проверяем, что item принадлежит этому tenant
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id")
      .eq("id", itemId)
      .eq("tenant_id", tenant.id)
      .single();

    if (itemError || !item) {
      return { ok: false, error: "Item not found" };
    }

    // Проверяем, что группа принадлежит этому tenant
    const { data: group, error: groupError } = await supabase
      .from("modifier_groups")
      .select("id")
      .eq("id", groupId)
      .eq("tenant_id", tenant.id)
      .single();

    if (groupError || !group) {
      return { ok: false, error: "Modifier group not found" };
    }

    // Проверяем, что привязка еще не существует
    const { data: existingBinding, error: checkError } = await supabase
      .from("item_modifier_groups")
      .select("id")
      .eq("item_id", itemId)
      .eq("group_id", groupId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { ok: false, error: checkError.message };
    }

    if (existingBinding) {
      return { ok: false, error: "Modifier group is already attached to this item" };
    }

    // Создаем привязку
    const { data: binding, error: createError } = await supabase
      .from("item_modifier_groups")
      .insert({
        tenant_id: tenant.id,
        item_id: itemId,
        group_id: groupId,
        sort: data.sort || 100,
        min: data.min,
        max: data.max,
        required: data.required,
        exclusive: data.exclusive,
        display: data.display,
        default_selection_json: data.default_selection,
      })
      .select()
      .single();

    if (createError) {
      return { ok: false, error: createError.message };
    }

    return { ok: true, data: binding };
  } catch (error) {
    console.error("Attach modifier group to item error:", error);
    return { ok: false, error: "Failed to attach modifier group to item. Please try again." };
  }
}

export async function attachModifierGroupToVariant(variantId: string, groupId: ModifierGroupId, data: CreateItemModifierGroupData) {
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

    // Проверяем, что variant принадлежит этому tenant
    const { data: variant, error: variantError } = await supabase
      .from("item_variants")
      .select(`
        id,
        items!inner(
          id,
          tenant_id
        )
      `)
      .eq("id", variantId)
      .eq("items.tenant_id", tenant.id)
      .single();

    if (variantError || !variant) {
      return { ok: false, error: "Variant not found" };
    }

    // Проверяем, что группа принадлежит этому tenant
    const { data: group, error: groupError } = await supabase
      .from("modifier_groups")
      .select("id")
      .eq("id", groupId)
      .eq("tenant_id", tenant.id)
      .single();

    if (groupError || !group) {
      return { ok: false, error: "Modifier group not found" };
    }

    // Проверяем, что привязка еще не существует
    const { data: existingBinding, error: checkError } = await supabase
      .from("item_modifier_groups")
      .select("id")
      .eq("variant_id", variantId)
      .eq("group_id", groupId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { ok: false, error: checkError.message };
    }

    if (existingBinding) {
      return { ok: false, error: "Modifier group is already attached to this variant" };
    }

    // Создаем привязку
    const { data: binding, error: createError } = await supabase
      .from("item_modifier_groups")
      .insert({
        tenant_id: tenant.id,
        variant_id: variantId,
        group_id: groupId,
        sort: data.sort || 100,
        min: data.min,
        max: data.max,
        required: data.required,
        exclusive: data.exclusive,
        display: data.display,
        default_selection_json: data.default_selection,
      })
      .select()
      .single();

    if (createError) {
      return { ok: false, error: createError.message };
    }

    return { ok: true, data: binding };
  } catch (error) {
    console.error("Attach modifier group to variant error:", error);
    return { ok: false, error: "Failed to attach modifier group to variant. Please try again." };
  }
}

export async function updateItemModifierGroup(bindingId: ItemModifierGroupId, data: UpdateItemModifierGroupData) {
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

    // Проверяем, что привязка принадлежит этому tenant
    const { data: existingBinding, error: checkError } = await supabase
      .from("item_modifier_groups")
      .select("id")
      .eq("id", bindingId)
      .eq("tenant_id", tenant.id)
      .single();

    if (checkError || !existingBinding) {
      return { ok: false, error: "Item modifier group not found" };
    }

    // Обновляем привязку
    const updateData: Record<string, unknown> = {};
    if (data.sort !== undefined) updateData.sort = data.sort;
    if (data.min !== undefined) updateData.min = data.min;
    if (data.max !== undefined) updateData.max = data.max;
    if (data.required !== undefined) updateData.required = data.required;
    if (data.exclusive !== undefined) updateData.exclusive = data.exclusive;
    if (data.display) updateData.display = data.display;
    if (data.default_selection !== undefined) updateData.default_selection_json = data.default_selection;

    const { data: binding, error: updateError } = await supabase
      .from("item_modifier_groups")
      .update(updateData)
      .eq("id", bindingId)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true, data: binding };
  } catch (error) {
    console.error("Update item modifier group error:", error);
    return { ok: false, error: "Failed to update item modifier group. Please try again." };
  }
}

export async function deleteItemModifierGroup(bindingId: ItemModifierGroupId) {
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

    // Проверяем, что привязка принадлежит этому tenant
    const { data: existingBinding, error: checkError } = await supabase
      .from("item_modifier_groups")
      .select("id")
      .eq("id", bindingId)
      .eq("tenant_id", tenant.id)
      .single();

    if (checkError || !existingBinding) {
      return { ok: false, error: "Item modifier group not found" };
    }

    // Удаляем привязку
    const { error: deleteError } = await supabase
      .from("item_modifier_groups")
      .delete()
      .eq("id", bindingId)
      .eq("tenant_id", tenant.id);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Delete item modifier group error:", error);
    return { ok: false, error: "Failed to delete item modifier group. Please try again." };
  }
}
