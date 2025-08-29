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
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/app/app/actions/categories';
import { getItems, createItem, updateItem, deleteItem } from '@/app/app/actions/items';
import { getCategoryItems, createCategoryItem, deleteCategoryItem } from '@/app/app/actions/category-items';
import { getCatalogTree } from '@/app/app/actions/catalog';

describe('Catalog Repository Tests', () => {
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

  describe('Categories Repository', () => {
    it('should get categories for authenticated user', async () => {
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

      // Мокаем получение категорий
      const mockCategoriesQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: [
                { 
                  id: 'category-1', 
                  code: 'burgers',
                  category_i18n: [{ locale: 'en-US', title: 'Burgers' }]
                },
                { 
                  id: 'category-2', 
                  code: 'bowls',
                  category_i18n: [{ locale: 'en-US', title: 'Bowls' }]
                },
              ],
              error: null,
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockCategoriesQuery); // categories

      const result = await getCategories();

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].code).toBe('burgers');
      expect(result.data?.[1].code).toBe('bowls');
    });

    it('should create category with i18n', async () => {
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

      // Мокаем проверку уникальности code (не найден)
      const mockCodeCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          })),
        })),
      };

      // Мокаем создание категории
      const mockCreateQuery = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-category-id', code: 'new-category' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем создание i18n
      const mockI18nQuery = {
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockCodeCheckQuery) // categories (code check)
        .mockReturnValueOnce(mockCreateQuery) // categories (create)
        .mockReturnValueOnce(mockI18nQuery); // category_i18n

      const result = await createCategory({
        code: 'new-category',
        i18n: [
          { locale: 'en-US', title: 'New Category' },
          { locale: 'ru-RU', title: 'Новая категория' }
        ],
      });

      expect(result.ok).toBe(true);
      expect(result.data?.code).toBe('new-category');
    });

    it('should reject duplicate category code', async () => {
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

      // Мокаем проверку уникальности code (найден дубликат)
      const mockCodeCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-category-id' },
              error: null,
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockCodeCheckQuery); // categories (code check)

      const result = await createCategory({
        code: 'existing-code',
        i18n: [{ locale: 'en-US', title: 'Existing Category' }],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Category with this code already exists');
    });
  });

  describe('Items Repository', () => {
    it('should create simple item without variants', async () => {
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

      // Мокаем проверку уникальности SKU (не найден)
      const mockSkuCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          })),
        })),
      };

      // Мокаем создание позиции
      const mockCreateQuery = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-item-id', base_sku: 'NEW-ITEM' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем создание i18n
      const mockI18nQuery = {
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockSkuCheckQuery) // items (sku check)
        .mockReturnValueOnce(mockCreateQuery) // items (create)
        .mockReturnValueOnce(mockI18nQuery); // item_i18n

      const result = await createItem({
        base_sku: 'NEW-ITEM',
        product_type: 'simple',
        i18n: [
          { locale: 'en-US', title: 'New Item' },
          { locale: 'ru-RU', title: 'Новая позиция' }
        ],
      });

      expect(result.ok).toBe(true);
      expect(result.data?.base_sku).toBe('NEW-ITEM');
      expect(result.data?.product_type).toBe('simple');
    });

    it('should create variant item with exactly one default variant', async () => {
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

      // Мокаем проверку уникальности SKU (не найден)
      const mockSkuCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          })),
        })),
      };

      // Мокаем создание позиции
      const mockCreateQuery = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-item-id', base_sku: 'VARIANT-ITEM' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем создание i18n
      const mockI18nQuery = {
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      // Мокаем создание вариантов
      const mockVariantsQuery = {
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockSkuCheckQuery) // items (sku check)
        .mockReturnValueOnce(mockCreateQuery) // items (create)
        .mockReturnValueOnce(mockI18nQuery) // item_i18n
        .mockReturnValueOnce(mockVariantsQuery); // item_variants

      const result = await createItem({
        base_sku: 'VARIANT-ITEM',
        product_type: 'variant',
        i18n: [
          { locale: 'en-US', title: 'Variant Item' }
        ],
        variants: [
          { variant_sku: 'VARIANT-ITEM-SMALL', is_default: true, size: 'small' },
          { variant_sku: 'VARIANT-ITEM-LARGE', is_default: false, size: 'large' }
        ],
      });

      expect(result.ok).toBe(true);
      expect(result.data?.base_sku).toBe('VARIANT-ITEM');
      expect(result.data?.product_type).toBe('variant');
    });

    it('should reject variant item without variants', async () => {
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

      // Мокаем проверку уникальности SKU (не найден)
      const mockSkuCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockSkuCheckQuery); // items (sku check)

      const result = await createItem({
        base_sku: 'VARIANT-ITEM',
        product_type: 'variant',
        i18n: [
          { locale: 'en-US', title: 'Variant Item' }
        ],
        // Без вариантов
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Variant items must have at least one variant');
    });

    it('should reject variant item without default variant', async () => {
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

      // Мокаем проверку уникальности SKU (не найден)
      const mockSkuCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockSkuCheckQuery); // items (sku check)

      const result = await createItem({
        base_sku: 'VARIANT-ITEM',
        product_type: 'variant',
        i18n: [
          { locale: 'en-US', title: 'Variant Item' }
        ],
        variants: [
          { variant_sku: 'VARIANT-ITEM-SMALL', is_default: false, size: 'small' },
          { variant_sku: 'VARIANT-ITEM-LARGE', is_default: false, size: 'large' }
        ],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Variant items must have exactly one default variant');
    });
  });

  describe('Category Items Repository', () => {
    it('should link item to category', async () => {
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

      // Мокаем проверку категории
      const mockCategoryQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-category-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем проверку позиции
      const mockItemQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-item-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем проверку существующей связи (не найдена)
      const mockLinkCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          })),
        })),
      };

      // Мокаем создание связи
      const mockCreateQuery = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                category_id: 'test-category-id',
                item_id: 'test-item-id',
                sort: 100
              },
              error: null,
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockCategoryQuery) // categories
        .mockReturnValueOnce(mockItemQuery) // items
        .mockReturnValueOnce(mockLinkCheckQuery) // category_items (check)
        .mockReturnValueOnce(mockCreateQuery); // category_items (create)

      const result = await createCategoryItem({
        category_id: 'test-category-id',
        item_id: 'test-item-id',
        sort: 100,
      });

      expect(result.ok).toBe(true);
      expect(result.data?.category_id).toBe('test-category-id');
      expect(result.data?.item_id).toBe('test-item-id');
    });

    it('should reject duplicate category-item link', async () => {
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

      // Мокаем проверку категории
      const mockCategoryQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-category-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем проверку позиции
      const mockItemQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-item-id' },
              error: null,
            }),
          })),
        })),
      };

      // Мокаем проверку существующей связи (найдена)
      const mockLinkCheckQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { category_id: 'test-category-id' },
              error: null,
            }),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockCategoryQuery) // categories
        .mockReturnValueOnce(mockItemQuery) // items
        .mockReturnValueOnce(mockLinkCheckQuery); // category_items (check)

      const result = await createCategoryItem({
        category_id: 'test-category-id',
        item_id: 'test-item-id',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Item is already linked to this category');
    });
  });

  describe('Catalog Tree API', () => {
    it('should return catalog tree structure', async () => {
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

      // Мокаем получение дерева каталога
      const mockCatalogQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'category-1',
                    code: 'burgers',
                    status: 'active',
                    category_i18n: [
                      { locale: 'en-US', title: 'Burgers' }
                    ],
                    category_items: [
                      {
                        sort: 100,
                        items: {
                          id: 'item-1',
                          base_sku: 'BEEF-BURGER',
                          product_type: 'simple',
                          status: 'active',
                          item_i18n: [
                            { locale: 'en-US', title: 'Beef Burger' }
                          ],
                          item_media: [
                            { id: 'media-1', kind: 'primary', url: 'test.jpg' }
                          ],
                          item_variants: []
                        }
                      }
                    ]
                  }
                ],
                error: null,
              }),
            })),
          })),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTenantQuery) // tenants
        .mockReturnValueOnce(mockCatalogQuery); // categories

      const result = await getCatalogTree({ locale: 'en-US' });

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].category.title).toBe('Burgers');
      expect(result.data?.[0].items).toHaveLength(1);
      expect(result.data?.[0].items[0].title).toBe('Beef Burger');
      expect(result.data?.[0].items[0].product_type).toBe('simple');
    });
  });
});
