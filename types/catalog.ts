// Типы для каталога меню
// T-02. Каталог: категории → позиции → варианты (+ i18n и медиа)

export type CategoryId = string;
export type ItemId = string;
export type ItemVariantId = string;
export type ItemMediaId = string;
export type BrandId = string;

export interface Category {
  id: CategoryId;
  tenant_id: string;
  brand_id?: BrandId;
  code: string;
  sort: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface CategoryI18n {
  category_id: CategoryId;
  locale: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface CategoryWithI18n extends Category {
  i18n: CategoryI18n[];
}

export interface Item {
  id: ItemId;
  tenant_id: string;
  base_sku: string;
  product_type: 'simple' | 'variant';
  status: 'active' | 'inactive';
  allergen_mask: number;
  kds_station?: string;
  print_profile?: string;
  created_at: string;
}

export interface ItemI18n {
  item_id: ItemId;
  locale: string;
  title: string;
  description?: string;
  seo_meta?: Record<string, any>;
  created_at: string;
}

export interface ItemMedia {
  id: ItemMediaId;
  item_id: ItemId;
  kind: 'primary' | 'gallery' | 'icon';
  url: string;
  alt?: string;
  aspect_ratio?: string;
  created_at: string;
}

export interface ItemVariant {
  id: ItemVariantId;
  item_id: ItemId;
  variant_sku: string;
  is_default: boolean;
  size?: string;
  weight?: number;
  volume?: number;
  barcode?: string;
  created_at: string;
}

export interface ItemWithDetails extends Item {
  i18n: ItemI18n[];
  media: ItemMedia[];
  variants: ItemVariant[];
}

export interface CategoryItem {
  category_id: CategoryId;
  item_id: ItemId;
  sort: number;
  created_at: string;
}

export interface CatalogTreeItem {
  category: {
    id: CategoryId;
    title: string;
  };
  items: Array<{
    id: ItemId;
    title: string;
    product_type: 'simple' | 'variant';
    media: {
      primary?: ItemMedia;
    };
    variants: ItemVariant[];
  }>;
}

// Типы для создания/обновления
export interface CreateCategoryData {
  brand_id?: BrandId;
  code: string;
  sort?: number;
  status?: 'active' | 'inactive';
  i18n: Array<{
    locale: string;
    title: string;
    description?: string;
  }>;
}

export interface UpdateCategoryData {
  brand_id?: BrandId;
  code?: string;
  sort?: number;
  status?: 'active' | 'inactive';
  i18n?: Array<{
    locale: string;
    title: string;
    description?: string;
  }>;
}

export interface CreateItemData {
  base_sku: string;
  product_type: 'simple' | 'variant';
  status?: 'active' | 'inactive';
  allergen_mask?: number;
  kds_station?: string;
  print_profile?: string;
  i18n: Array<{
    locale: string;
    title: string;
    description?: string;
    seo_meta?: Record<string, any>;
  }>;
  media?: Array<{
    kind: 'primary' | 'gallery' | 'icon';
    url: string;
    alt?: string;
    aspect_ratio?: string;
  }>;
  variants?: Array<{
    variant_sku: string;
    is_default?: boolean;
    size?: string;
    weight?: number;
    volume?: number;
    barcode?: string;
  }>;
}

export interface UpdateItemData {
  base_sku?: string;
  product_type?: 'simple' | 'variant';
  status?: 'active' | 'inactive';
  allergen_mask?: number;
  kds_station?: string;
  print_profile?: string;
  i18n?: Array<{
    locale: string;
    title: string;
    description?: string;
    seo_meta?: Record<string, any>;
  }>;
  media?: Array<{
    kind: 'primary' | 'gallery' | 'icon';
    url: string;
    alt?: string;
    aspect_ratio?: string;
  }>;
  variants?: Array<{
    variant_sku: string;
    is_default?: boolean;
    size?: string;
    weight?: number;
    volume?: number;
    barcode?: string;
  }>;
}

export interface CreateCategoryItemData {
  category_id: CategoryId;
  item_id: ItemId;
  sort?: number;
}

export interface UpdateCategoryItemData {
  sort?: number;
}

// Параметры для фильтрации
export interface GetCategoriesParams {
  brand_id?: BrandId;
  status?: 'active' | 'inactive';
  locale?: string;
}

export interface GetItemsParams {
  status?: 'active' | 'inactive';
  product_type?: 'simple' | 'variant';
  locale?: string;
}

export interface GetCatalogTreeParams {
  brand_id?: BrandId;
  locale?: string;
}
