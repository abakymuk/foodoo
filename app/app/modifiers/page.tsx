"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import {
  getModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  getModifiers,
  createModifier,
  updateModifier,
  deleteModifier,
} from "../actions/modifiers";
import type { ModifierGroup, Modifier } from "@/types/modifiers";

export default function ModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    code: "",
    status: "active" as const,
    min: 0,
    max: 1,
    required: false,
    exclusive: false,
    display: "list" as const,
    title_ru: "",
    description_ru: "",
    title_en: "",
    description_en: "",
  });

  const [modifierForm, setModifierForm] = useState({
    code: "",
    status: "active" as const,
    price_delta: 0,
    default_qty: 0,
    max_qty: 1,
    sort: 100,
    title_ru: "",
    description_ru: "",
    title_en: "",
    description_en: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, modifiersData] = await Promise.all([
        getModifierGroups(),
        getModifiers(),
      ]);
      setGroups(groupsData);
      setModifiers(modifiersData);
    } catch (error) {
      toast.error("Ошибка загрузки данных");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      await createModifierGroup({
        ...formData,
        i18n: {
          ru: {
            title: formData.title_ru,
            description: formData.description_ru,
          },
          en: {
            title: formData.title_en,
            description: formData.description_en,
          },
        },
      });
      toast.success("Группа создана");
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error("Ошибка создания группы");
      console.error(error);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;
    try {
      await updateModifierGroup(selectedGroup.id, {
        ...formData,
        i18n: {
          ru: {
            title: formData.title_ru,
            description: formData.description_ru,
          },
          en: {
            title: formData.title_en,
            description: formData.description_en,
          },
        },
      });
      toast.success("Группа обновлена");
      setIsEditDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error("Ошибка обновления группы");
      console.error(error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    try {
      await deleteModifierGroup(selectedGroup.id);
      toast.success("Группа удалена");
      setIsDeleteDialogOpen(false);
      setSelectedGroup(null);
      loadData();
    } catch (error) {
      toast.error("Ошибка удаления группы");
      console.error(error);
    }
  };

  const handleCreateModifier = async () => {
    if (!selectedGroup) return;
    try {
      await createModifier({
        ...modifierForm,
        group_id: selectedGroup.id,
        i18n: {
          ru: {
            title: modifierForm.title_ru,
            description: modifierForm.description_ru,
          },
          en: {
            title: modifierForm.title_en,
            description: modifierForm.description_en,
          },
        },
      });
      toast.success("Опция создана");
      resetModifierForm();
      loadData();
    } catch (error) {
      toast.error("Ошибка создания опции");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      status: "active",
      min: 0,
      max: 1,
      required: false,
      exclusive: false,
      display: "list",
      title_ru: "",
      description_ru: "",
      title_en: "",
      description_en: "",
    });
  };

  const resetModifierForm = () => {
    setModifierForm({
      code: "",
      status: "active",
      price_delta: 0,
      default_qty: 0,
      max_qty: 1,
      sort: 100,
      title_ru: "",
      description_ru: "",
      title_en: "",
      description_en: "",
    });
  };

  const openEditDialog = (group: ModifierGroup) => {
    setSelectedGroup(group);
    setFormData({
      code: group.code,
      status: group.status,
      min: group.min,
      max: group.max,
      required: group.required,
      exclusive: group.exclusive,
      display: group.display,
      title_ru: group.i18n?.ru?.title || "",
      description_ru: group.i18n?.ru?.description || "",
      title_en: group.i18n?.en?.title || "",
      description_en: group.i18n?.en?.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (group: ModifierGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const getGroupModifiers = (groupId: string) => {
    return modifiers.filter((m) => m.group_id === groupId);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Группы модификаторов"
        description="Управление группами модификаторов и их опциями"
        actions={
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Создать группу
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Создать группу модификаторов</DialogTitle>
              </DialogHeader>
              <GroupForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleCreateGroup}
                submitLabel="Создать"
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {group.i18n?.ru?.title || group.code}
                    <Badge
                      variant={
                        group.status === "active" ? "default" : "secondary"
                      }
                    >
                      {group.status === "active" ? "Активна" : "Неактивна"}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Код: {group.code} • Отображение:{" "}
                    {getDisplayLabel(group.display)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>
                          Управление группой:{" "}
                          {group.i18n?.ru?.title || group.code}
                        </DialogTitle>
                      </DialogHeader>
                      <Tabs defaultValue="settings" className="w-full">
                        <TabsList>
                          <TabsTrigger value="settings">Настройки</TabsTrigger>
                          <TabsTrigger value="options">Опции</TabsTrigger>
                        </TabsList>

                        <TabsContent value="settings" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Минимум</Label>
                              <div className="text-sm font-medium">
                                {group.min}
                              </div>
                            </div>
                            <div>
                              <Label>Максимум</Label>
                              <div className="text-sm font-medium">
                                {group.max}
                              </div>
                            </div>
                            <div>
                              <Label>Обязательно</Label>
                              <div className="text-sm font-medium">
                                {group.required ? "Да" : "Нет"}
                              </div>
                            </div>
                            <div>
                              <Label>Исключающий</Label>
                              <div className="text-sm font-medium">
                                {group.exclusive ? "Да" : "Нет"}
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="options" className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-medium">
                              Опции группы
                            </h4>
                            <Button
                              size="sm"
                              onClick={() => setSelectedGroup(group)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Добавить опцию
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {getGroupModifiers(group.id).map((modifier) => (
                              <div
                                key={modifier.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div>
                                  <div className="font-medium">
                                    {modifier.i18n?.ru?.title || modifier.code}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Цена:{" "}
                                    {modifier.price_delta > 0
                                      ? `+${modifier.price_delta}`
                                      : modifier.price_delta}{" "}
                                    ₽
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      modifier.status === "active"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {modifier.status === "active"
                                      ? "Активна"
                                      : "Неактивна"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {getGroupModifiers(group.id).length === 0 && (
                              <div className="text-center text-muted-foreground py-8">
                                Опции не добавлены
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(group)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(group)}
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
                    Мин: {group.min}, Макс: {group.max}
                  </div>
                  {group.required && (
                    <div className="text-orange-600">Обязательно</div>
                  )}
                  {group.exclusive && (
                    <div className="text-blue-600">Исключающий</div>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Опций:</span>
                  <div>{getGroupModifiers(group.id).length}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Отображение:</span>
                  <div>{getDisplayLabel(group.display)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Статус:</span>
                  <div>
                    {group.status === "active" ? "Активна" : "Неактивна"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {groups.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                Группы модификаторов не созданы
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Создать первую группу
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать группу модификаторов</DialogTitle>
          </DialogHeader>
          <GroupForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdateGroup}
            submitLabel="Сохранить"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить группу</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Вы уверены, что хотите удалить группу "
              {selectedGroup?.i18n?.ru?.title || selectedGroup?.code}"? Это
              действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button variant="destructive" onClick={handleDeleteGroup}>
                Удалить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Modifier Dialog */}
      {selectedGroup && (
        <Dialog>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Добавить опцию в группу "
                {selectedGroup.i18n?.ru?.title || selectedGroup.code}"
              </DialogTitle>
            </DialogHeader>
            <ModifierForm
              formData={modifierForm}
              setFormData={setModifierForm}
              onSubmit={handleCreateModifier}
              submitLabel="Создать"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function GroupForm({
  formData,
  setFormData,
  onSubmit,
  submitLabel,
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Код</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="protein"
          />
        </div>
        <div>
          <Label htmlFor="status">Статус</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активна</SelectItem>
              <SelectItem value="inactive">Неактивна</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="min">Минимум</Label>
          <Input
            id="min"
            type="number"
            value={formData.min}
            onChange={(e) =>
              setFormData({ ...formData, min: parseInt(e.target.value) })
            }
            min={0}
          />
        </div>
        <div>
          <Label htmlFor="max">Максимум</Label>
          <Input
            id="max"
            type="number"
            value={formData.max}
            onChange={(e) =>
              setFormData({ ...formData, max: parseInt(e.target.value) })
            }
            min={formData.min}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="required"
            checked={formData.required}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, required: checked })
            }
          />
          <Label htmlFor="required">Обязательно</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="exclusive"
            checked={formData.exclusive}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, exclusive: checked })
            }
          />
          <Label htmlFor="exclusive">Исключающий</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="display">Отображение</Label>
        <Select
          value={formData.display}
          onValueChange={(value) =>
            setFormData({ ...formData, display: value })
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

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">Локализация</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title_ru">Название (RU)</Label>
            <Input
              id="title_ru"
              value={formData.title_ru}
              onChange={(e) =>
                setFormData({ ...formData, title_ru: e.target.value })
              }
              placeholder="Выберите протеин"
            />
          </div>
          <div>
            <Label htmlFor="title_en">Название (EN)</Label>
            <Input
              id="title_en"
              value={formData.title_en}
              onChange={(e) =>
                setFormData({ ...formData, title_en: e.target.value })
              }
              placeholder="Choose protein"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="description_ru">Описание (RU)</Label>
            <Input
              id="description_ru"
              value={formData.description_ru}
              onChange={(e) =>
                setFormData({ ...formData, description_ru: e.target.value })
              }
              placeholder="Выберите основной протеин"
            />
          </div>
          <div>
            <Label htmlFor="description_en">Описание (EN)</Label>
            <Input
              id="description_en"
              value={formData.description_en}
              onChange={(e) =>
                setFormData({ ...formData, description_en: e.target.value })
              }
              placeholder="Choose main protein"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
}

function ModifierForm({
  formData,
  setFormData,
  onSubmit,
  submitLabel,
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="modifier_code">Код</Label>
          <Input
            id="modifier_code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="chicken"
          />
        </div>
        <div>
          <Label htmlFor="modifier_status">Статус</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активна</SelectItem>
              <SelectItem value="inactive">Неактивна</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price_delta">Цена (₽)</Label>
          <Input
            id="price_delta"
            type="number"
            step="0.01"
            value={formData.price_delta}
            onChange={(e) =>
              setFormData({
                ...formData,
                price_delta: parseFloat(e.target.value),
              })
            }
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="default_qty">По умолчанию</Label>
          <Input
            id="default_qty"
            type="number"
            value={formData.default_qty}
            onChange={(e) =>
              setFormData({
                ...formData,
                default_qty: parseInt(e.target.value),
              })
            }
            min={0}
          />
        </div>
        <div>
          <Label htmlFor="max_qty">Максимум</Label>
          <Input
            id="max_qty"
            type="number"
            value={formData.max_qty}
            onChange={(e) =>
              setFormData({ ...formData, max_qty: parseInt(e.target.value) })
            }
            min={formData.default_qty}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="sort">Сортировка</Label>
        <Input
          id="sort"
          type="number"
          value={formData.sort}
          onChange={(e) =>
            setFormData({ ...formData, sort: parseInt(e.target.value) })
          }
          min={0}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">Локализация</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="modifier_title_ru">Название (RU)</Label>
            <Input
              id="modifier_title_ru"
              value={formData.title_ru}
              onChange={(e) =>
                setFormData({ ...formData, title_ru: e.target.value })
              }
              placeholder="Курица"
            />
          </div>
          <div>
            <Label htmlFor="modifier_title_en">Название (EN)</Label>
            <Input
              id="modifier_title_en"
              value={formData.title_en}
              onChange={(e) =>
                setFormData({ ...formData, title_en: e.target.value })
              }
              placeholder="Chicken"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="modifier_description_ru">Описание (RU)</Label>
            <Input
              id="modifier_description_ru"
              value={formData.description_ru}
              onChange={(e) =>
                setFormData({ ...formData, description_ru: e.target.value })
              }
              placeholder="Свежая курица"
            />
          </div>
          <div>
            <Label htmlFor="modifier_description_en">Описание (EN)</Label>
            <Input
              id="modifier_description_en"
              value={formData.description_en}
              onChange={(e) =>
                setFormData({ ...formData, description_en: e.target.value })
              }
              placeholder="Fresh chicken"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
}
