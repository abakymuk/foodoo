"use client";

import { useState, useEffect } from "react";
import { Plus, GripVertical, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  getModifierGroups,
  getItemModifiers,
  attachModifierGroupToItem,
  updateItemModifierGroup,
  deleteItemModifierGroup,
} from "../app/app/actions/modifiers";
import type { ModifierGroup, ItemModifierGroup } from "@/types/modifiers";

interface ItemModifiersTabProps {
  itemId: string;
  variantId?: string;
}

export function ItemModifiersTab({ itemId, variantId }: ItemModifiersTabProps) {
  const [itemModifiers, setItemModifiers] = useState<ItemModifierGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingModifier, setEditingModifier] =
    useState<ItemModifierGroup | null>(null);

  // Form states
  const [overrides, setOverrides] = useState({
    min: 0,
    max: 1,
    required: false,
    exclusive: false,
    display: "list" as "list" | "radio" | "quantity",
    sort: 100,
  });

  useEffect(() => {
    loadData();
  }, [itemId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [modifiersData, groupsData] = await Promise.all([
        getItemModifiers(itemId),
        getModifierGroups("active"),
      ]);
      setItemModifiers(modifiersData);
      setAvailableGroups(groupsData);
    } catch (error) {
      toast.error("Ошибка загрузки данных");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttachGroup = async () => {
    if (!selectedGroup) return;
    try {
      await attachModifierGroupToItem(itemId, selectedGroup.id, {
        min: overrides.min,
        max: overrides.max,
        required: overrides.required,
        exclusive: overrides.exclusive,
        display: overrides.display,
      });
      toast.success("Группа модификаторов привязана");
      setIsAddDialogOpen(false);
      resetOverrides();
      loadData();
    } catch (error) {
      toast.error("Ошибка привязки группы");
      console.error(error);
    }
  };

  const handleUpdateModifier = async () => {
    if (!editingModifier) return;
    try {
      await updateItemModifierGroup(editingModifier.id, {
        sort: overrides.sort,
        min: overrides.min,
        max: overrides.max,
        required: overrides.required,
        exclusive: overrides.exclusive,
        display: overrides.display,
      });
      toast.success("Настройки обновлены");
      setIsEditDialogOpen(false);
      resetOverrides();
      loadData();
    } catch (error) {
      toast.error("Ошибка обновления настроек");
      console.error(error);
    }
  };

  const handleDeleteModifier = async (modifierId: string) => {
    try {
      await deleteItemModifierGroup(modifierId);
      toast.success("Модификатор удален");
      loadData();
    } catch (error) {
      toast.error("Ошибка удаления модификатора");
      console.error(error);
    }
  };

  const resetOverrides = () => {
    setOverrides({
      min: 0,
      max: 1,
      required: false,
      exclusive: false,
      display: "list",
      sort: 100,
    });
  };

  const openEditDialog = (modifier: ItemModifierGroup) => {
    setEditingModifier(modifier);
    setOverrides({
      min: modifier.min || 0,
      max: modifier.max || 1,
      required: modifier.required || false,
      exclusive: modifier.exclusive || false,
      display: (modifier.display as "list" | "radio" | "quantity") || "list",
      sort: modifier.sort,
    });
    setIsEditDialogOpen(true);
  };

  const getDisplayLabel = (display: string) => {
    switch (display) {
      case "list":
        return "Список";
      case "radio":
        return "Радио";
      case "quantity":
        return "Количество";
      default:
        return display;
    }
  };

  const getEffectiveRules = (modifier: ItemModifierGroup) => {
    const group = modifier.group;
    if (!group)
      return {
        min: 0,
        max: 1,
        required: false,
        exclusive: false,
        display: "list",
      };

    return {
      min: modifier.min ?? group.min,
      max: modifier.max ?? group.max,
      required: modifier.required ?? group.required,
      exclusive: modifier.exclusive ?? group.exclusive,
      display: modifier.display ?? group.display,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Модификаторы позиции</h3>
          <p className="text-sm text-muted-foreground">
            Управление группами модификаторов для этой позиции
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Добавить группу
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Добавить группу модификаторов</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Выберите группу</Label>
                <Select
                  onValueChange={(value) => {
                    const group = availableGroups.find((g) => g.id === value);
                    setSelectedGroup(group || null);
                    if (group) {
                      setOverrides({
                        min: group.min,
                        max: group.max,
                        required: group.required,
                        exclusive: group.exclusive,
                        display: group.display,
                        sort: 100,
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу модификаторов" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.i18n?.ru?.title || group.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGroup && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium">Настройки для этой позиции</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min">Минимум</Label>
                        <Input
                          id="min"
                          type="number"
                          value={overrides.min}
                          onChange={(e) =>
                            setOverrides({
                              ...overrides,
                              min: parseInt(e.target.value),
                            })
                          }
                          min={0}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max">Максимум</Label>
                        <Input
                          id="max"
                          type="number"
                          value={overrides.max}
                          onChange={(e) =>
                            setOverrides({
                              ...overrides,
                              max: parseInt(e.target.value),
                            })
                          }
                          min={overrides.min}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="required"
                          checked={overrides.required}
                          onCheckedChange={(checked) =>
                            setOverrides({ ...overrides, required: !!checked })
                          }
                        />
                        <Label htmlFor="required">Обязательно</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="exclusive"
                          checked={overrides.exclusive}
                          onCheckedChange={(checked) =>
                            setOverrides({ ...overrides, exclusive: !!checked })
                          }
                        />
                        <Label htmlFor="exclusive">Исключающий</Label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="display">Отображение</Label>
                      <Select
                        value={overrides.display}
                        onValueChange={(value) =>
                          setOverrides({ ...overrides, display: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="list">Список</SelectItem>
                          <SelectItem value="radio">Радио</SelectItem>
                          <SelectItem value="quantity">Количество</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sort">Порядок</Label>
                      <Input
                        id="sort"
                        type="number"
                        value={overrides.sort}
                        onChange={(e) =>
                          setOverrides({
                            ...overrides,
                            sort: parseInt(e.target.value),
                          })
                        }
                        min={0}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button onClick={handleAttachGroup} disabled={!selectedGroup}>
                  Добавить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {itemModifiers.map((itemModifier) => {
          const group = itemModifier.group;
          const rules = getEffectiveRules(itemModifier);

          if (!group) return null;

          return (
            <Card key={itemModifier.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {group.i18n?.ru?.title || group.code}
                    </CardTitle>
                    <Badge variant="outline">
                      {group.modifiers?.length || 0} опций
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(itemModifier)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteModifier(itemModifier.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Правила:</span>
                    <div>
                      Мин: {rules.min}, Макс: {rules.max}
                    </div>
                    {rules.required && (
                      <div className="text-orange-600">Обязательно</div>
                    )}
                    {rules.exclusive && (
                      <div className="text-blue-600">Исключающий</div>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Отображение:</span>
                    <div>{getDisplayLabel(rules.display)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Порядок:</span>
                    <div>{itemModifier.sort}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Оверрайды:</span>
                    <div>
                      {itemModifier.min !== null ||
                      itemModifier.max !== null ||
                      itemModifier.required !== null ||
                      itemModifier.exclusive !== null ||
                      itemModifier.display
                        ? "Есть"
                        : "Нет"}
                    </div>
                  </div>
                </div>

                {group.modifiers && group.modifiers.length > 0 && (
                  <div className="mt-4">
                    <span className="text-sm text-muted-foreground">
                      Опции:
                    </span>
                    <div className="mt-2 space-y-1">
                      {group.modifiers.slice(0, 3).map((modifier) => (
                        <div key={modifier.id} className="text-sm">
                          • {modifier.i18n?.ru?.title || modifier.code}
                          {modifier.price_delta > 0 &&
                            ` (+${modifier.price_delta}₽)`}
                        </div>
                      ))}
                      {group.modifiers.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          ... и еще {group.modifiers.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {itemModifiers.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                К этой позиции не привязаны группы модификаторов
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить первую группу
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать настройки модификатора</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_min">Минимум</Label>
                <Input
                  id="edit_min"
                  type="number"
                  value={overrides.min}
                  onChange={(e) =>
                    setOverrides({
                      ...overrides,
                      min: parseInt(e.target.value),
                    })
                  }
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="edit_max">Максимум</Label>
                <Input
                  id="edit_max"
                  type="number"
                  value={overrides.max}
                  onChange={(e) =>
                    setOverrides({
                      ...overrides,
                      max: parseInt(e.target.value),
                    })
                  }
                  min={overrides.min}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_required"
                  checked={overrides.required}
                  onCheckedChange={(checked) =>
                    setOverrides({ ...overrides, required: !!checked })
                  }
                />
                <Label htmlFor="edit_required">Обязательно</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_exclusive"
                  checked={overrides.exclusive}
                  onCheckedChange={(checked) =>
                    setOverrides({ ...overrides, exclusive: !!checked })
                  }
                />
                <Label htmlFor="edit_exclusive">Исключающий</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_display">Отображение</Label>
              <Select
                value={overrides.display}
                onValueChange={(value) =>
                  setOverrides({ ...overrides, display: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">Список</SelectItem>
                  <SelectItem value="radio">Радио</SelectItem>
                  <SelectItem value="quantity">Количество</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_sort">Порядок</Label>
              <Input
                id="edit_sort"
                type="number"
                value={overrides.sort}
                onChange={(e) =>
                  setOverrides({ ...overrides, sort: parseInt(e.target.value) })
                }
                min={0}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button onClick={handleUpdateModifier}>Сохранить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
