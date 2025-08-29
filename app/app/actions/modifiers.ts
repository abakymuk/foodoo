"use server";

import { createClient } from "@/lib/auth/server";
import type { 
  ModifierGroup, 
  Modifier, 
  CreateModifierGroupInput, 
  UpdateModifierGroupInput,
  CreateModifierInput,
  UpdateModifierInput
} from "@/types/modifiers";

// ===== ГРУППЫ МОДИФИКАТОРОВ =====

export async function getModifierGroups(status?: string, q?: string) {
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from("modifier_groups")
      .select(`
        *,
        modifier_group_i18n (
          locale,
          title,
          description
        )
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (q) {
      query = query.or(`code.ilike.%${q}%,modifier_group_i18n.title.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching modifier groups:", error);
      throw new Error("Ошибка загрузки групп модификаторов");
    }

    // Преобразуем i18n в удобный формат
    const groups = data?.map(group => ({
      ...group,
      i18n: {
        ru: group.modifier_group_i18n?.find(i => i.locale === "ru"),
        en: group.modifier_group_i18n?.find(i => i.locale === "en")
      }
    })) || [];

    return groups as ModifierGroup[];
  } catch (error) {
    console.error("Error in getModifierGroups:", error);
    throw error;
  }
}

export async function getModifierGroupById(id: string): Promise<ModifierGroup | null> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("modifier_groups")
      .select(`
        *,
        modifier_group_i18n (
          locale,
          title,
          description
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Не найдено
      }
      console.error("Error fetching modifier group:", error);
      throw new Error("Ошибка загрузки группы модификаторов");
    }

    if (!data) return null;

    // Преобразуем i18n в удобный формат
    const group = {
      ...data,
      i18n: {
        ru: data.modifier_group_i18n?.find(i => i.locale === "ru"),
        en: data.modifier_group_i18n?.find(i => i.locale === "en")
      }
    };

    return group as ModifierGroup;
  } catch (error) {
    console.error("Error in getModifierGroupById:", error);
    throw error;
  }
}

export async function createModifierGroup(input: CreateModifierGroupInput) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Пользователь не авторизован");
    }

    // Получаем tenant_id пользователя
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (!tenant) {
      throw new Error("Тенант не найден");
    }

    // Создаем группу
    const { data: group, error: groupError } = await supabase
      .from("modifier_groups")
      .insert({
        tenant_id: tenant.id,
        code: input.code,
        status: input.status,
        min: input.min,
        max: input.max,
        required: input.required,
        exclusive: input.exclusive,
        display: input.display
      })
      .select()
      .single();

    if (groupError) {
      console.error("Error creating modifier group:", groupError);
      throw new Error("Ошибка создания группы модификаторов");
    }

    // Создаем i18n записи
    const i18nData = [];
    if (input.i18n?.ru) {
      i18nData.push({
        group_id: group.id,
        locale: "ru",
        title: input.i18n.ru.title,
        description: input.i18n.ru.description
      });
    }
    if (input.i18n?.en) {
      i18nData.push({
        group_id: group.id,
        locale: "en",
        title: input.i18n.en.title,
        description: input.i18n.en.description
      });
    }

    if (i18nData.length > 0) {
      const { error: i18nError } = await supabase
        .from("modifier_group_i18n")
        .insert(i18nData);

      if (i18nError) {
        console.error("Error creating i18n:", i18nError);
        // Удаляем группу если i18n не создалось
        await supabase.from("modifier_groups").delete().eq("id", group.id);
        throw new Error("Ошибка создания локализации");
      }
    }

    return group;
  } catch (error) {
    console.error("Error in createModifierGroup:", error);
    throw error;
  }
}

export async function updateModifierGroup(id: string, input: UpdateModifierGroupInput) {
  const supabase = await createClient();
  
  try {
    // Обновляем группу
    const { error: groupError } = await supabase
      .from("modifier_groups")
      .update({
        code: input.code,
        status: input.status,
        min: input.min,
        max: input.max,
        required: input.required,
        exclusive: input.exclusive,
        display: input.display
      })
      .eq("id", id);

    if (groupError) {
      console.error("Error updating modifier group:", groupError);
      throw new Error("Ошибка обновления группы модификаторов");
    }

    // Обновляем i18n записи
    if (input.i18n) {
      // Удаляем старые записи
      await supabase
        .from("modifier_group_i18n")
        .delete()
        .eq("group_id", id);

      // Создаем новые записи
      const i18nData = [];
      if (input.i18n.ru) {
        i18nData.push({
          group_id: id,
          locale: "ru",
          title: input.i18n.ru.title,
          description: input.i18n.ru.description
        });
      }
      if (input.i18n.en) {
        i18nData.push({
          group_id: id,
          locale: "en",
          title: input.i18n.en.title,
          description: input.i18n.en.description
        });
      }

      if (i18nData.length > 0) {
        const { error: i18nError } = await supabase
          .from("modifier_group_i18n")
          .insert(i18nData);

        if (i18nError) {
          console.error("Error updating i18n:", i18nError);
          throw new Error("Ошибка обновления локализации");
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateModifierGroup:", error);
    throw error;
  }
}

export async function deleteModifierGroup(id: string) {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from("modifier_groups")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting modifier group:", error);
      throw new Error("Ошибка удаления группы модификаторов");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteModifierGroup:", error);
    throw error;
  }
}

// ===== МОДИФИКАТОРЫ (ОПЦИИ) =====

export async function getModifiers(groupId?: string, status?: string) {
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from("modifiers")
      .select(`
        *,
        modifier_i18n (
          locale,
          title,
          description
        )
      `)
      .order("sort", { ascending: true });

    if (groupId) {
      query = query.eq("group_id", groupId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching modifiers:", error);
      throw new Error("Ошибка загрузки модификаторов");
    }

    // Преобразуем i18n в удобный формат
    const modifiers = data?.map(modifier => ({
      ...modifier,
      i18n: {
        ru: modifier.modifier_i18n?.find(i => i.locale === "ru"),
        en: modifier.modifier_i18n?.find(i => i.locale === "en")
      }
    })) || [];

    return modifiers as Modifier[];
  } catch (error) {
    console.error("Error in getModifiers:", error);
    throw error;
  }
}

export async function getModifierById(id: string): Promise<Modifier | null> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("modifiers")
      .select(`
        *,
        modifier_i18n (
          locale,
          title,
          description
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Не найдено
      }
      console.error("Error fetching modifier:", error);
      throw new Error("Ошибка загрузки модификатора");
    }

    if (!data) return null;

    // Преобразуем i18n в удобный формат
    const modifier = {
      ...data,
      i18n: {
        ru: data.modifier_i18n?.find(i => i.locale === "ru"),
        en: data.modifier_i18n?.find(i => i.locale === "en")
      }
    };

    return modifier as Modifier;
  } catch (error) {
    console.error("Error in getModifierById:", error);
    throw error;
  }
}

export async function createModifier(input: CreateModifierInput) {
  const supabase = await createClient();
  
  try {
    // Создаем модификатор
    const { data: modifier, error: modifierError } = await supabase
      .from("modifiers")
      .insert({
        group_id: input.group_id,
        code: input.code,
        status: input.status,
        price_delta: input.price_delta,
        default_qty: input.default_qty,
        max_qty: input.max_qty,
        sort: input.sort
      })
      .select()
      .single();

    if (modifierError) {
      console.error("Error creating modifier:", modifierError);
      throw new Error("Ошибка создания модификатора");
    }

    // Создаем i18n записи
    const i18nData = [];
    if (input.i18n?.ru) {
      i18nData.push({
        modifier_id: modifier.id,
        locale: "ru",
        title: input.i18n.ru.title,
        description: input.i18n.ru.description
      });
    }
    if (input.i18n?.en) {
      i18nData.push({
        modifier_id: modifier.id,
        locale: "en",
        title: input.i18n.en.title,
        description: input.i18n.en.description
      });
    }

    if (i18nData.length > 0) {
      const { error: i18nError } = await supabase
        .from("modifier_i18n")
        .insert(i18nData);

      if (i18nError) {
        console.error("Error creating modifier i18n:", i18nError);
        // Удаляем модификатор если i18n не создалось
        await supabase.from("modifiers").delete().eq("id", modifier.id);
        throw new Error("Ошибка создания локализации");
      }
    }

    return modifier;
  } catch (error) {
    console.error("Error in createModifier:", error);
    throw error;
  }
}

export async function updateModifier(id: string, input: UpdateModifierInput) {
  const supabase = await createClient();
  
  try {
    // Обновляем модификатор
    const { error: modifierError } = await supabase
      .from("modifiers")
      .update({
        code: input.code,
        status: input.status,
        price_delta: input.price_delta,
        default_qty: input.default_qty,
        max_qty: input.max_qty,
        sort: input.sort
      })
      .eq("id", id);

    if (modifierError) {
      console.error("Error updating modifier:", modifierError);
      throw new Error("Ошибка обновления модификатора");
    }

    // Обновляем i18n записи
    if (input.i18n) {
      // Удаляем старые записи
      await supabase
        .from("modifier_i18n")
        .delete()
        .eq("modifier_id", id);

      // Создаем новые записи
      const i18nData = [];
      if (input.i18n.ru) {
        i18nData.push({
          modifier_id: id,
          locale: "ru",
          title: input.i18n.ru.title,
          description: input.i18n.ru.description
        });
      }
      if (input.i18n.en) {
        i18nData.push({
          modifier_id: id,
          locale: "en",
          title: input.i18n.en.title,
          description: input.i18n.en.description
        });
      }

      if (i18nData.length > 0) {
        const { error: i18nError } = await supabase
          .from("modifier_i18n")
          .insert(i18nData);

        if (i18nError) {
          console.error("Error updating modifier i18n:", i18nError);
          throw new Error("Ошибка обновления локализации");
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateModifier:", error);
    throw error;
  }
}

export async function deleteModifier(id: string) {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from("modifiers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting modifier:", error);
      throw new Error("Ошибка удаления модификатора");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteModifier:", error);
    throw error;
  }
}

// ===== ПРИВЯЗКА К ITEM/VARIANT =====

export async function getItemModifiers(itemId: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("item_modifier_groups")
      .select(`
        *,
        modifier_groups (
          *,
          modifier_group_i18n (
            locale,
            title,
            description
          ),
          modifiers (
            *,
            modifier_i18n (
              locale,
              title,
              description
            )
          )
        )
      `)
      .eq("item_id", itemId)
      .order("sort", { ascending: true });

    if (error) {
      console.error("Error fetching item modifiers:", error);
      throw new Error("Ошибка загрузки модификаторов позиции");
    }

    // Преобразуем данные в удобный формат
    const itemModifiers = data?.map(item => {
      const group = item.modifier_groups;
      return {
        ...item,
        group: {
          ...group,
          i18n: {
            ru: group.modifier_group_i18n?.find(i => i.locale === "ru"),
            en: group.modifier_group_i18n?.find(i => i.locale === "en")
          },
          modifiers: group.modifiers?.map(modifier => ({
            ...modifier,
            i18n: {
              ru: modifier.modifier_i18n?.find(i => i.locale === "ru"),
              en: modifier.modifier_i18n?.find(i => i.locale === "en")
            }
          })) || []
        }
      };
    }) || [];

    return itemModifiers;
  } catch (error) {
    console.error("Error in getItemModifiers:", error);
    throw error;
  }
}

export async function attachModifierGroupToItem(
  itemId: string, 
  groupId: string, 
  overrides?: {
    min?: number;
    max?: number;
    required?: boolean;
    exclusive?: boolean;
    display?: string;
  },
  defaultSelection?: Array<{ modifier_id: string; qty: number }>
) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Пользователь не авторизован");
    }

    // Получаем tenant_id пользователя
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (!tenant) {
      throw new Error("Тенант не найден");
    }

    const { data, error } = await supabase
      .from("item_modifier_groups")
      .insert({
        tenant_id: tenant.id,
        item_id: itemId,
        group_id: groupId,
        min: overrides?.min,
        max: overrides?.max,
        required: overrides?.required,
        exclusive: overrides?.exclusive,
        display: overrides?.display,
        default_selection_json: defaultSelection ? JSON.stringify(defaultSelection) : null
      })
      .select()
      .single();

    if (error) {
      console.error("Error attaching modifier group to item:", error);
      throw new Error("Ошибка привязки группы модификаторов к позиции");
    }

    return data;
  } catch (error) {
    console.error("Error in attachModifierGroupToItem:", error);
    throw error;
  }
}

export async function attachModifierGroupToVariant(
  variantId: string, 
  groupId: string, 
  overrides?: {
    min?: number;
    max?: number;
    required?: boolean;
    exclusive?: boolean;
    display?: string;
  },
  defaultSelection?: Array<{ modifier_id: string; qty: number }>
) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Пользователь не авторизован");
    }

    // Получаем tenant_id пользователя
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (!tenant) {
      throw new Error("Тенант не найден");
    }

    const { data, error } = await supabase
      .from("item_modifier_groups")
      .insert({
        tenant_id: tenant.id,
        variant_id: variantId,
        group_id: groupId,
        min: overrides?.min,
        max: overrides?.max,
        required: overrides?.required,
        exclusive: overrides?.exclusive,
        display: overrides?.display,
        default_selection_json: defaultSelection ? JSON.stringify(defaultSelection) : null
      })
      .select()
      .single();

    if (error) {
      console.error("Error attaching modifier group to variant:", error);
      throw new Error("Ошибка привязки группы модификаторов к варианту");
    }

    return data;
  } catch (error) {
    console.error("Error in attachModifierGroupToVariant:", error);
    throw error;
  }
}

export async function updateItemModifierGroup(
  id: string,
  updates: {
    sort?: number;
    min?: number;
    max?: number;
    required?: boolean;
    exclusive?: boolean;
    display?: string;
    default_selection_json?: Array<{ modifier_id: string; qty: number }>;
  }
) {
  const supabase = await createClient();
  
  try {
    const updateData: any = {};
    if (updates.sort !== undefined) updateData.sort = updates.sort;
    if (updates.min !== undefined) updateData.min = updates.min;
    if (updates.max !== undefined) updateData.max = updates.max;
    if (updates.required !== undefined) updateData.required = updates.required;
    if (updates.exclusive !== undefined) updateData.exclusive = updates.exclusive;
    if (updates.display !== undefined) updateData.display = updates.display;
    if (updates.default_selection_json !== undefined) {
      updateData.default_selection_json = JSON.stringify(updates.default_selection_json);
    }

    const { error } = await supabase
      .from("item_modifier_groups")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating item modifier group:", error);
      throw new Error("Ошибка обновления привязки модификаторов");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateItemModifierGroup:", error);
    throw error;
  }
}

export async function deleteItemModifierGroup(id: string) {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from("item_modifier_groups")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting item modifier group:", error);
      throw new Error("Ошибка удаления привязки модификаторов");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteItemModifierGroup:", error);
    throw error;
  }
}
