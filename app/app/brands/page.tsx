"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
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

import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../actions/brands";
import type {
  Brand,
  CreateBrandData,
  UpdateBrandData,
} from "@/types/multibrand";

export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<CreateBrandData>({
    name: "",
    slug: "",
    status: "active",
  });

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const result = await getBrands();
      if (result.ok) {
        setBrands(result.data || []);
      } else {
        toast.error(result.error || "Не удалось загрузить бренды");
      }
    } catch (error) {
      console.error("Load brands error:", error);
      toast.error("Ошибка при загрузке брендов");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBrand = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createBrand(formData);
      if (result.ok) {
        toast.success("Бренд успешно создан");
        setIsDialogOpen(false);
        setFormData({ name: "", slug: "", status: "active" });
        loadBrands();
      } else {
        toast.error(result.error || "Не удалось создать бренд");
      }
    } catch (error) {
      console.error("Create brand error:", error);
      toast.error("Ошибка при создании бренда");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateBrand = async () => {
    if (!editingBrand || !formData.name.trim() || !formData.slug.trim()) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateBrand(editingBrand.id, formData);
      if (result.ok) {
        toast.success("Бренд успешно обновлен");
        setIsDialogOpen(false);
        setEditingBrand(null);
        setFormData({ name: "", slug: "", status: "active" });
        loadBrands();
      } else {
        toast.error(result.error || "Не удалось обновить бренд");
      }
    } catch (error) {
      console.error("Update brand error:", error);
      toast.error("Ошибка при обновлении бренда");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот бренд?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteBrand(brandId);
      if (result.ok) {
        toast.success("Бренд успешно удален");
        loadBrands();
      } else {
        toast.error(result.error || "Не удалось удалить бренд");
      }
    } catch (error) {
      console.error("Delete brand error:", error);
      toast.error("Ошибка при удалении бренда");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      status: brand.status,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBrand(null);
    setFormData({ name: "", slug: "", status: "active" });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingBrand(null);
    setFormData({ name: "", slug: "", status: "active" });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Бренды"
          description="Управление брендами вашего ресторана"
        />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Бренды"
        description="Управление брендами вашего ресторана"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить бренд
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBrand ? "Редактировать бренд" : "Создать бренд"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Название *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Введите название бренда"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="brand-slug"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Статус</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: value as "active" | "inactive",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активный</SelectItem>
                      <SelectItem value="inactive">Неактивный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={closeDialog}>
                    Отмена
                  </Button>
                  <Button
                    onClick={
                      editingBrand ? handleUpdateBrand : handleCreateBrand
                    }
                    disabled={isCreating || isUpdating}
                  >
                    {isCreating || isUpdating
                      ? "Сохранение..."
                      : editingBrand
                      ? "Обновить"
                      : "Создать"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {brands.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Бренды не найдены</h3>
            <p className="text-gray-500 mb-4">
              Создайте первый бренд для вашего ресторана
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить бренд
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-gray-500" />
                    <div>
                      <CardTitle className="text-lg">{brand.name}</CardTitle>
                      <p className="text-sm text-gray-500">/{brand.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        brand.status === "active" ? "default" : "secondary"
                      }
                    >
                      {brand.status === "active" ? "Активный" : "Неактивный"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(brand)}
                      disabled={isUpdating}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBrand(brand.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
