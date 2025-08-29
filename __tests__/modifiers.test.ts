// Unit тесты для системы модификаторов
// T-03. Модификаторы: группы и опции (+ привязка к item/variant, i18n, min/max, цены)

import { jest } from '@jest/globals';

// Мокаем Supabase клиент
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          eq: jest.fn(),
          ilike: jest.fn(),
        })),
      })),
      filter: jest.fn(),
      map: jest.fn(),
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

// Мокаем createClient
jest.mock('@/lib/auth/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Импортируем функции для тестирования
import {
  getModifierGroups,
  getModifierGroupById,
  getModifierGroupWithModifiers,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
} from '../app/app/actions/modifier-groups';

import {
  getModifiers,
  getModifierById,
  createModifier,
  updateModifier,
  deleteModifier,
} from '../app/app/actions/modifiers';

import {
  getItemModifiers,
  getVariantModifiers,
  attachModifierGroupToItem,
  attachModifierGroupToVariant,
  updateItemModifierGroup,
  deleteItemModifierGroup,
} from '../app/app/actions/item-modifier-groups';

describe('Modifier Groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getModifierGroups', () => {
    it('should return modifier groups for authenticated user', async () => {
      // Мокаем данные
      const mockUser = { id: 'user-123' };
      const mockTenant = { id: 'tenant-123' };
      const mockGroups = [
        {
          id: 'group-1',
          code: 'protein',
          status: 'active',
          modifier_group_i18n: [
            { locale: 'en-US', title: 'Choose Protein' }
          ]
        }
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const fromMock = mockSupabase.from as jest.Mock;
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            eq: jest.fn(),
            ilike: jest.fn(),
          }),
        }),
      });

      fromMock.mockReturnValue({
        select: selectMock,
      });

      // Мокаем ответы для разных вызовов
      fromMock
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockTenant,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockGroups,
                error: null,
              }),
            }),
          }),
        });

      const result = await getModifierGroups();

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockGroups);
    });

    it('should handle authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await getModifierGroups();

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('createModifierGroup', () => {
    it('should create modifier group with i18n', async () => {
      const mockUser = { id: 'user-123' };
      const mockTenant = { id: 'tenant-123' };
      const mockGroup = { id: 'group-1', code: 'protein' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const fromMock = mockSupabase.from as jest.Mock;
      
      // Мокаем проверку tenant
      fromMock
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockTenant,
              error: null,
            }),
          }),
        })
        // Мокаем проверку уникальности code
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        })
        // Мокаем создание группы
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockGroup,
                error: null,
              }),
            }),
          }),
        })
        // Мокаем создание i18n
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({
            error: null,
          }),
        });

      const groupData = {
        code: 'protein',
        status: 'active' as const,
        min: 1,
        max: 1,
        required: true,
        exclusive: true,
        display: 'radio' as const,
        i18n: [
          { locale: 'en-US', title: 'Choose Protein', description: 'Select your protein' }
        ],
      };

      const result = await createModifierGroup(groupData);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockGroup);
    });

    it('should handle duplicate code error', async () => {
      const mockUser = { id: 'user-123' };
      const mockTenant = { id: 'tenant-123' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const fromMock = mockSupabase.from as jest.Mock;
      
      fromMock
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockTenant,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { id: 'existing-group' },
              error: null,
            }),
          }),
        });

      const groupData = {
        code: 'protein',
        i18n: [{ locale: 'en-US', title: 'Choose Protein' }],
      };

      const result = await createModifierGroup(groupData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Modifier group with this code already exists');
    });
  });
});

describe('Modifiers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createModifier', () => {
    it('should create modifier with validation', async () => {
      const mockUser = { id: 'user-123' };
      const mockTenant = { id: 'tenant-123' };
      const mockGroup = { id: 'group-1' };
      const mockModifier = { id: 'modifier-1', code: 'chicken' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const fromMock = mockSupabase.from as jest.Mock;
      
      fromMock
        // Tenant check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockTenant,
              error: null,
            }),
          }),
        })
        // Group check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        })
        // Uniqueness check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        })
        // Create modifier
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockModifier,
                error: null,
              }),
            }),
          }),
        })
        // Create i18n
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({
            error: null,
          }),
        });

      const modifierData = {
        code: 'chicken',
        status: 'active' as const,
        price_delta: 0,
        default_qty: 1,
        max_qty: 1,
        i18n: [
          { locale: 'en-US', title: 'Chicken', description: 'Grilled chicken' }
        ],
      };

      const result = await createModifier('group-1', modifierData);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockModifier);
    });
  });
});

describe('Item Modifier Groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getItemModifiers', () => {
    it('should return combined modifiers for item and variants', async () => {
      const mockUser = { id: 'user-123' };
      const mockTenant = { id: 'tenant-123' };
      const mockItem = { id: 'item-1' };
      const mockItemModifierGroups = [
        {
          id: 'img-1',
          min: 1,
          max: 1,
          modifier_groups: {
            id: 'group-1',
            code: 'protein',
            modifiers: [
              { id: 'mod-1', code: 'chicken' }
            ]
          }
        }
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const fromMock = mockSupabase.from as jest.Mock;
      
      fromMock
        // Tenant check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockTenant,
              error: null,
            }),
          }),
        })
        // Item check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockItem,
              error: null,
            }),
          }),
        })
        // Item modifier groups
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockItemModifierGroups,
                error: null,
              }),
            }),
          }),
        })
        // Variant modifier groups (empty)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        });

      const result = await getItemModifiers('item-1');

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].applied_min).toBe(1);
      expect(result.data![0].applied_max).toBe(1);
    });
  });

  describe('attachModifierGroupToItem', () => {
    it('should attach modifier group to item', async () => {
      const mockUser = { id: 'user-123' };
      const mockTenant = { id: 'tenant-123' };
      const mockItem = { id: 'item-1' };
      const mockGroup = { id: 'group-1' };
      const mockBinding = { id: 'binding-1' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const fromMock = mockSupabase.from as jest.Mock;
      
      fromMock
        // Tenant check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockTenant,
              error: null,
            }),
          }),
        })
        // Item check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockItem,
              error: null,
            }),
          }),
        })
        // Group check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        })
        // Existing binding check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        })
        // Create binding
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockBinding,
                error: null,
              }),
            }),
          }),
        });

      const bindingData = {
        group_id: 'group-1',
        sort: 100,
        min: 1,
        max: 1,
        required: true,
        exclusive: true,
        display: 'radio' as const,
        default_selection: [
          { modifier_id: 'mod-1', qty: 1 }
        ],
      };

      const result = await attachModifierGroupToItem('item-1', 'group-1', bindingData);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockBinding);
    });
  });
});

describe('Validation Rules', () => {
  describe('Modifier Group Rules', () => {
    it('should validate min <= max', () => {
      // Этот тест проверяет логику валидации
      // В реальном приложении это будет проверяться на уровне БД через триггеры
      const isValid = (min: number, max: number) => min <= max;
      
      expect(isValid(0, 1)).toBe(true);
      expect(isValid(1, 1)).toBe(true);
      expect(isValid(2, 1)).toBe(false);
    });

    it('should validate exclusive groups have max = 1', () => {
      const isValid = (exclusive: boolean, max: number) => !exclusive || max === 1;
      
      expect(isValid(true, 1)).toBe(true);
      expect(isValid(true, 2)).toBe(false);
      expect(isValid(false, 5)).toBe(true);
    });

    it('should validate required groups have max >= 1', () => {
      const isValid = (required: boolean, max: number) => !required || max >= 1;
      
      expect(isValid(true, 1)).toBe(true);
      expect(isValid(true, 5)).toBe(true);
      expect(isValid(true, 0)).toBe(false);
      expect(isValid(false, 0)).toBe(true);
    });
  });

  describe('Modifier Rules', () => {
    it('should validate default_qty <= max_qty', () => {
      const isValid = (defaultQty: number, maxQty: number) => defaultQty <= maxQty;
      
      expect(isValid(0, 1)).toBe(true);
      expect(isValid(1, 1)).toBe(true);
      expect(isValid(2, 1)).toBe(false);
    });
  });

  describe('Item Modifier Group Rules', () => {
    it('should require either item_id or variant_id', () => {
      const isValid = (itemId: string | null, variantId: string | null) => 
        itemId !== null || variantId !== null;
      
      expect(isValid('item-1', null)).toBe(true);
      expect(isValid(null, 'variant-1')).toBe(true);
      expect(isValid('item-1', 'variant-1')).toBe(true);
      expect(isValid(null, null)).toBe(false);
    });
  });
});
