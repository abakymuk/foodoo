"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/auth/server";
import type { 
  CatalogTreeItem,
  GetCatalogTreeParams
} from "@/types/catalog";

export async function getCatalogTree(params: GetCatalogTreeParams = {}) {
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

    // Строим запрос для получения дерева каталога
    let query = supabase
      .from("categories")
      .select(`
        id,
        code,
        sort,
        status,
        category_i18n!inner(
          locale,
          title,
          description
        ),
        category_items!inner(
          sort,
          items!inner(
            id,
            base_sku,
            product_type,
            status,
            item_i18n!inner(
              locale,
              title,
              description
            ),
            item_media(
              id,
              kind,
              url,
              alt,
              aspect_ratio
            ),
            item_variants(
              id,
              variant_sku,
              is_default,
              size,
              weight,
              volume,
              barcode
            )
          )
        )
      `)
      .eq("tenant_id", tenant.id)
      .eq("status", "active");

    // Применяем фильтры
    if (params.brand_id) {
      query = query.eq("brand_id", params.brand_id);
    }

    // Фильтруем i18n по локали, если указана
    if (params.locale) {
      query = query.eq("category_i18n.locale", params.locale);
      query = query.eq("category_items.items.item_i18n.locale", params.locale);
    }

    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      return { ok: false, error: categoriesError.message, data: null };
    }

    // Преобразуем данные в нужный формат
    const catalogTree: CatalogTreeItem[] = (categories || [])
      .filter(category => category.status === 'active')
      .map(category => {
        // Получаем i18n для категории
        const categoryI18n = category.category_i18n?.find((i18n: any) => 
          !params.locale || i18n.locale === params.locale
        );

        // Обрабатываем позиции в категории
        const items = (category.category_items || [])
          .filter((ci: any) => ci.items && ci.items.status === 'active')
          .map((ci: any) => {
            const item = ci.items;
            
            // Получаем i18n для позиции
            const itemI18n = item.item_i18n?.find((i18n: any) => 
              !params.locale || i18n.locale === params.locale
            );

            // Получаем primary медиа
            const primaryMedia = item.item_media?.find((media: any) => media.kind === 'primary');

            return {
              id: item.id,
              title: itemI18n?.title || item.base_sku,
              product_type: item.product_type,
              media: {
                primary: primaryMedia || undefined,
              },
              variants: item.item_variants || [],
            };
          })
          .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));

        return {
          category: {
            id: category.id,
            title: categoryI18n?.title || category.code,
          },
          items,
        };
      })
      .filter(category => category.items.length > 0) // Убираем пустые категории
      .sort((a, b) => (a.category.title || '').localeCompare(b.category.title || ''));

    return { ok: true, data: catalogTree };
  } catch (error) {
    console.error("Get catalog tree error:", error);
    return { ok: false, error: "Failed to get catalog tree. Please try again.", data: null };
  }
}
