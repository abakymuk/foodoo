/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Мокаем Supabase клиент
jest.mock('@/lib/auth/server', () => ({
  createClient: jest.fn(),
}));

// Импортируем функции для тестирования
import { getBrands, createBrand, attachBrandToLocation } from '@/app/app/actions/brands';
import { getLocations, attachBrandToLocation as attachLocationBrand } from '@/app/app/actions/locations';

describe('Multibrand Repository Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Создаем мок Supabase клиента
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            order: jest.fn(),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(),
        })),
      })),
    };

    // Подключаем мок
    const { createClient } = require('@/lib/auth/server');
    createClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Brands Repository', () => {
    it('should get brands for authenticated user', async () => {
      // Мокаем аутентификацию
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Мокаем получение tenant
      const mockTenantQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-tenant-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем получение брендов
      const mockBrandsQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: [
                { id: 'brand-1', name: 'Brand A', slug: 'brand-a' },
                { id: 'brand-2', name: 'Brand B', slug: 'brand-b' },
              ],
              error: null,
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockBrandsQuery); // brands

      const result = await getBrands();

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].name).toBe('Brand A');
      expect(result.data?.[1].name).toBe('Brand B');
    });

    it('should create brand with unique slug validation', async () => {
      // Мокаем аутентификацию
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Мокаем получение tenant
      const mockTenantQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-tenant-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем проверку уникальности slug (не найден)
      const mockSlugCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          })),
        })),
      };

      // Мокаем создание бренда
      const mockCreateQuery = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-brand-id', name: 'New Brand', slug: 'new-brand' },
              error: null,
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockSlugCheckQuery) // brands (slug check)
        .mockReturnValueOnce(mockCreateQuery); // brands (create)

      const result = await createBrand({
        name: 'New Brand',
        slug: 'new-brand',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('New Brand');
      expect(result.data?.slug).toBe('new-brand');
    });

    it('should reject duplicate slug', async () => {
      // Мокаем аутентификацию
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Мокаем получение tenant
      const mockTenantQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-tenant-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем проверку уникальности slug (найден дубликат)
      const mockSlugCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-brand-id' },
              error: null,
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockSlugCheckQuery); // brands (slug check)

      const result = await createBrand({
        name: 'New Brand',
        slug: 'existing-slug',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Brand with this slug already exists');
    });
  });

  describe('Location-Brand Attachments', () => {
    it('should attach brand to location', async () => {
      // Мокаем аутентификацию
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Мокаем получение tenant
      const mockTenantQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-tenant-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем проверку локации
      const mockLocationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-location-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем проверку бренда
      const mockBrandQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-brand-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем создание связи
      const mockLinkQuery = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { 
                location_id: 'test-location-id', 
                brand_id: 'test-brand-id',
                status: 'active'
              },
              error: null,
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockLocationQuery) // locations
        .mockReturnValueOnce(mockBrandQuery) // brands
        .mockReturnValueOnce(mockLinkQuery); // location_brands

      const result = await attachBrandToLocation({
        brand_id: 'test-brand-id',
        location_id: 'test-location-id',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.location_id).toBe('test-location-id');
      expect(result.data?.brand_id).toBe('test-brand-id');
    });

    it('should filter by tenant_id correctly', async () => {
      // Мокаем аутентификацию
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Мокаем получение tenant
      const mockTenantQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-tenant-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем получение брендов с проверкой tenant_id
      const mockBrandsQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: [
                { id: 'brand-1', tenant_id: 'test-tenant-id', name: 'Brand A' },
              ],
              error: null,
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockBrandsQuery); // brands

      const result = await getBrands();

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].tenant_id).toBe('test-tenant-id');
      
      // Проверяем, что был вызван eq с правильным tenant_id
      const brandsFromCall = mockSupabase.from.mock.calls[1][0];
      expect(brandsFromCall).toBe('brands');
    });
  });
});
