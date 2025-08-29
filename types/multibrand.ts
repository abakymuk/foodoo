// Типы для мультибрендовой модели
// T-01. База мультибрендов: tenants → brands → locations (+ привязки)

export type TenantId = string;
export type BrandId = string;
export type LocationId = string;

export interface Tenant {
  id: TenantId;
  owner_user_id: string;
  name: string;
  brand_name?: string;
  currency: string;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Brand {
  id: BrandId;
  tenant_id: TenantId;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Location {
  id: LocationId;
  tenant_id: TenantId;
  name: string;
  address?: {
    street: string;
    city: string;
    zip: string;
    lat: number;
    lon: number;
  };
  tz?: string;
  status: 'active' | 'inactive';
}

export interface LocationBrand {
  location_id: LocationId;
  brand_id: BrandId;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface LocationBrandView {
  location_id: LocationId;
  location_name: string;
  location_address?: {
    street: string;
    city: string;
    zip: string;
    lat: number;
    lon: number;
  };
  location_tz?: string;
  location_status: 'active' | 'inactive';
  brand_id: BrandId;
  brand_name: string;
  brand_slug: string;
  brand_status: 'active' | 'inactive';
  link_status: 'active' | 'inactive';
  tenant_id: TenantId;
  tenant_name: string;
}

// Типы для создания/обновления
export interface CreateBrandData {
  name: string;
  slug: string;
  status?: 'active' | 'inactive';
}

export interface UpdateBrandData {
  name?: string;
  slug?: string;
  status?: 'active' | 'inactive';
}

export interface CreateLocationData {
  name: string;
  address?: {
    street: string;
    city: string;
    zip: string;
    lat: number;
    lon: number;
  };
  tz?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateLocationData {
  name?: string;
  address?: {
    street: string;
    city: string;
    zip: string;
    lat: number;
    lon: number;
  };
  tz?: string;
  status?: 'active' | 'inactive';
}

export interface AttachBrandToLocationData {
  brand_id: BrandId;
  location_id: LocationId;
  status?: 'active' | 'inactive';
}

export interface DetachBrandFromLocationData {
  brand_id: BrandId;
  location_id: LocationId;
}
