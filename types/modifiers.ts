// Типы для системы модификаторов

// ===== ГРУППЫ МОДИФИКАТОРОВ =====

export interface ModifierGroup {
  id: string;
  tenant_id: string;
  code: string;
  status: "active" | "inactive";
  min: number;
  max: number;
  required: boolean;
  exclusive: boolean;
  display: "list" | "radio" | "quantity";
  created_at: string;
  updated_at: string;
  i18n?: {
    ru?: {
      title: string;
      description?: string;
    };
    en?: {
      title: string;
      description?: string;
    };
  };
  modifiers?: Modifier[];
}

export interface CreateModifierGroupInput {
  code: string;
  status: "active" | "inactive";
  min: number;
  max: number;
  required: boolean;
  exclusive: boolean;
  display: "list" | "radio" | "quantity";
  i18n?: {
    ru?: {
      title: string;
      description?: string;
    };
    en?: {
      title: string;
      description?: string;
    };
  };
}

export interface UpdateModifierGroupInput {
  code: string;
  status: "active" | "inactive";
  min: number;
  max: number;
  required: boolean;
  exclusive: boolean;
  display: "list" | "radio" | "quantity";
  i18n?: {
    ru?: {
      title: string;
      description?: string;
    };
    en?: {
      title: string;
      description?: string;
    };
  };
}

// ===== МОДИФИКАТОРЫ (ОПЦИИ) =====

export interface Modifier {
  id: string;
  group_id: string;
  code: string;
  status: "active" | "inactive";
  price_delta: number;
  default_qty: number;
  max_qty: number;
  inventory_link_id?: string;
  sort: number;
  created_at: string;
  updated_at: string;
  i18n?: {
    ru?: {
      title: string;
      description?: string;
    };
    en?: {
      title: string;
      description?: string;
    };
  };
}

export interface CreateModifierInput {
  group_id: string;
  code: string;
  status: "active" | "inactive";
  price_delta: number;
  default_qty: number;
  max_qty: number;
  sort: number;
  i18n?: {
    ru?: {
      title: string;
      description?: string;
    };
    en?: {
      title: string;
      description?: string;
    };
  };
}

export interface UpdateModifierInput {
  code: string;
  status: "active" | "inactive";
  price_delta: number;
  default_qty: number;
  max_qty: number;
  sort: number;
  i18n?: {
    ru?: {
      title: string;
      description?: string;
    };
    en?: {
      title: string;
      description?: string;
    };
  };
}

// ===== ПРИВЯЗКА К ITEM/VARIANT =====

export interface ItemModifierGroup {
  id: string;
  tenant_id: string;
  item_id?: string;
  variant_id?: string;
  group_id: string;
  sort: number;
  min?: number;
  max?: number;
  required?: boolean;
  exclusive?: boolean;
  display?: string;
  default_selection_json?: string;
  created_at: string;
  updated_at: string;
  group?: ModifierGroup;
}

// ===== УСТАРЕВШИЕ ТИПЫ (для обратной совместимости) =====

export interface ModifierWithI18n extends Modifier {
  modifier_i18n: Array<{
    locale: string;
    title: string;
    description?: string;
  }>;
}

export interface CreateModifierData {
  code: string;
  status?: "active" | "inactive";
  price_delta?: number;
  default_qty?: number;
  max_qty?: number;
  inventory_link_id?: string;
  sort?: number;
  i18n?: Array<{
    locale: string;
    title: string;
    description?: string;
  }>;
}

export interface UpdateModifierData {
  code?: string;
  status?: "active" | "inactive";
  price_delta?: number;
  default_qty?: number;
  max_qty?: number;
  inventory_link_id?: string;
  sort?: number;
  i18n?: Array<{
    locale: string;
    title: string;
    description?: string;
  }>;
}

export interface CreateModifierGroupData {
  code: string;
  status?: "active" | "inactive";
  min?: number;
  max?: number;
  required?: boolean;
  exclusive?: boolean;
  display?: "list" | "radio" | "quantity";
  i18n?: Array<{
    locale: string;
    title: string;
    description?: string;
  }>;
}

export interface UpdateModifierGroupData {
  code?: string;
  status?: "active" | "inactive";
  min?: number;
  max?: number;
  required?: boolean;
  exclusive?: boolean;
  display?: "list" | "radio" | "quantity";
  i18n?: Array<{
    locale: string;
    title: string;
    description?: string;
  }>;
}

// Типы для ID
export type ModifierId = string;
export type ModifierGroupId = string;

// Параметры для запросов
export interface GetModifiersParams {
  group_id?: string;
  status?: string;
  locale?: string;
}

// Валидация
export interface ModifierGroupValidation {
  min: number;
  max: number;
  required: boolean;
  exclusive: boolean;
}

export interface ModifierSelectionValidation {
  modifier_id: ModifierId;
  qty: number;
  max_qty: number;
}

// Результат валидации
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Расчёт цены
export interface PriceCalculation {
  base_price: number;
  modifier_price: number;
  total_price: number;
  breakdown: Array<{
    modifier_id: ModifierId;
    title: string;
    price_delta: number;
    qty: number;
    subtotal: number;
  }>;
}
