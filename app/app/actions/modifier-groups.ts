"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/auth/server";
import type { 
  ModifierGroup, 
  ModifierGroupWithI18n,
  ModifierGroupWithModifiers,
  CreateModifierGroupData, 
  UpdateModifierGroupData,
  ModifierGroupId,
  GetModifierGroupsParams
} from "@/types/modifiers";

export async function getModifierGroups(params: GetModifierGroupsParams = {}) {
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

    // Строим запрос для групп модификаторов
    const query = supabase
      .from("modifier_groups")
      .select(`
        *,
        modifier_group_i18n(*)
      `)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    // Применяем фильтры
    if (params.status) {
      query.eq("status", params.status);
    }
    if (params.q) {
      query.ilike("code", `%${params.q}%`);
    }

    const { data: groups, error: groupsError } = await query;

    if (groupsError) {
      return { ok: false, error: groupsError.message, data: null };
    }

    // Фильтруем i18n по локали, если указана
    let result = groups || [];
    if (params.locale) {
      result = result.map(group => ({
        ...group,
        modifier_group_i18n: group.modifier_group_i18n?.filter((i18n: any) => i18n.locale === params.locale) || []
      }));
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error("Get modifier groups error:", error);
    return { ok: false, error: "Failed to get modifier groups. Please try again.", data: null };
  }
}

export async function getModifierGroupById(groupId: ModifierGroupId, locale?: string) {
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
      .from("modifier_groups")
      .select(`
        *,
        modifier_group_i18n(*)
      `)
      .eq("id", groupId)
      .eq("tenant_id", tenant.id)
      .single();

    const { data: group, error: groupError } = await query;

    if (groupError) {
      return { ok: false, error: groupError.message, data: null };
    }

    if (!group) {
      return { ok: false, error: "Modifier group not found", data: null };
    }

    // Фильтруем i18n по локали, если указана
    if (locale) {
      group.modifier_group_i18n = group.modifier_group_i18n?.filter((i18n: any) => i18n.locale === locale) || [];
    }

    return { ok: true, data: group };
  } catch (error) {
    console.error("Get modifier group by ID error:", error);
    return { ok: false, error: "Failed to get modifier group. Please try again.", data: null };
  }
}

export async function getModifierGroupWithModifiers(groupId: ModifierGroupId, locale?: string) {
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

    // Строим запрос для группы с модификаторами
    const query = supabase
      .from("modifier_groups")
      .select(`
        *,
        modifier_group_i18n(*),
        modifiers(
          *,
          modifier_i18n(*)
        )
      `)
      .eq("id", groupId)
      .eq("tenant_id", tenant.id)
      .single();

    const { data: group, error: groupError } = await query;

    if (groupError) {
      return { ok: false, error: groupError.message, data: null };
    }

    if (!group) {
      return { ok: false, error: "Modifier group not found", data: null };
    }

    // Фильтруем i18n по локали, если указана
    if (locale) {
      group.modifier_group_i18n = group.modifier_group_i18n?.filter((i18n: any) => i18n.locale === locale) || [];
      
      if (group.modifiers) {
        group.modifiers = group.modifiers.map((modifier: any) => ({
          ...modifier,
          modifier_i18n: modifier.modifier_i18n?.filter((i18n: any) => i18n.locale === locale) || []
        }));
      }
    }

    return { ok: true, data: group };
  } catch (error) {
    console.error("Get modifier group with modifiers error:", error);
    return { ok: false, error: "Failed to get modifier group with modifiers. Please try again.", data: null };
  }
}

export async function createModifierGroup(groupData: CreateModifierGroupData) {
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
    const { data: existingGroup, error: checkError } = await supabase
      .from("modifier_groups")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("code", groupData.code)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { ok: false, error: checkError.message };
    }

    if (existingGroup) {
      return { ok: false, error: "Modifier group with this code already exists" };
    }

    // Создаем группу
    const { data: group, error: createError } = await supabase
      .from("modifier_groups")
      .insert({
        tenant_id: tenant.id,
        code: groupData.code,
        status: groupData.status || 'active',
        min: groupData.min || 0,
        max: groupData.max || 1,
        required: groupData.required || false,
        exclusive: groupData.exclusive || false,
        display: groupData.display || 'list',
      })
      .select()
      .single();

    if (createError) {
      return { ok: false, error: createError.message };
    }

    // Создаем i18n записи
    if (groupData.i18n && groupData.i18n.length > 0) {
      const i18nData = groupData.i18n.map(i18n => ({
        group_id: group.id,
        locale: i18n.locale,
        title: i18n.title,
        description: i18n.description,
      }));

      const { error: i18nError } = await supabase
        .from("modifier_group_i18n")
        .insert(i18nData);

      if (i18nError) {
        return { ok: false, error: i18nError.message };
      }
    }

    return { ok: true, data: group };
  } catch (error) {
    console.error("Create modifier group error:", error);
    return { ok: false, error: "Failed to create modifier group. Please try again." };
  }
}

export async function updateModifierGroup(groupId: ModifierGroupId, groupData: UpdateModifierGroupData) {
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

    // Проверяем, что группа принадлежит этому tenant
    const { data: existingGroup, error: checkError } = await supabase
      .from("modifier_groups")
      .select("id, code")
      .eq("id", groupId)
      .eq("tenant_id", tenant.id)
      .single();

    if (checkError || !existingGroup) {
      return { ok: false, error: "Modifier group not found" };
    }

    // Если изменяется code, проверяем уникальность
    if (groupData.code && groupData.code !== existingGroup.code) {
      const { data: duplicateGroup, error: duplicateError } = await supabase
        .from("modifier_groups")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("code", groupData.code)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        return { ok: false, error: duplicateError.message };
      }

      if (duplicateGroup) {
        return { ok: false, error: "Modifier group with this code already exists" };
      }
    }

    // Обновляем группу
    const updateData: Record<string, unknown> = {};
    if (groupData.code) updateData.code = groupData.code;
    if (groupData.status) updateData.status = groupData.status;
    if (groupData.min !== undefined) updateData.min = groupData.min;
    if (groupData.max !== undefined) updateData.max = groupData.max;
    if (groupData.required !== undefined) updateData.required = groupData.required;
    if (groupData.exclusive !== undefined) updateData.exclusive = groupData.exclusive;
    if (groupData.display) updateData.display = groupData.display;

    const { data: group, error: updateError } = await supabase
      .from("modifier_groups")
      .update(updateData)
      .eq("id", groupId)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    // Обновляем i18n записи
    if (groupData.i18n) {
      // Удаляем существующие i18n записи
      await supabase
        .from("modifier_group_i18n")
        .delete()
        .eq("group_id", groupId);

      // Создаем новые i18n записи
      if (groupData.i18n.length > 0) {
        const i18nData = groupData.i18n.map(i18n => ({
          group_id: groupId,
          locale: i18n.locale,
          title: i18n.title,
          description: i18n.description,
        }));

        const { error: i18nError } = await supabase
          .from("modifier_group_i18n")
          .insert(i18nData);

        if (i18nError) {
          return { ok: false, error: i18nError.message };
        }
      }
    }

    return { ok: true, data: group };
  } catch (error) {
    console.error("Update modifier group error:", error);
    return { ok: false, error: "Failed to update modifier group. Please try again." };
  }
}

export async function deleteModifierGroup(groupId: ModifierGroupId) {
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

    // Удаляем группу (каскадом удалятся i18n, modifiers и item_modifier_groups)
    const { error: deleteError } = await supabase
      .from("modifier_groups")
      .delete()
      .eq("id", groupId)
      .eq("tenant_id", tenant.id);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("Delete modifier group error:", error);
    return { ok: false, error: "Failed to delete modifier group. Please try again." };
  }
}
