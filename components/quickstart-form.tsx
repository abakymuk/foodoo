"use client";

import * as React from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeQuickstart } from "@/app/app/actions/quickstart";
import { toast } from "sonner";

interface QuickstartFormProps {
  onComplete?: () => void;
}

export function QuickstartForm({ onComplete }: QuickstartFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [formData, setFormData] = React.useState({
    brand: "",
    location: "",
    currency: "EUR" as "EUR" | "USD",
  });

  const isFormValid = formData.brand.trim() && formData.location.trim();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("Form submitted", { formData, isFormValid });

    if (!isFormValid) {
      console.log("Form is not valid");
      return;
    }

    console.log("Starting transition...");
    startTransition(async () => {
      console.log("Transition started, calling completeQuickstart...");
      try {
        const result = await completeQuickstart(formData);
        console.log("Server action result:", result);

        if (result.ok) {
          setIsCompleted(true);
          onComplete?.();
          toast.success("Настройки сохранены", {
            description: "Теперь вы можете создать меню и разместить заказы",
          });
        } else {
          toast.error("Ошибка сохранения", {
            description: result.error || "Попробуйте еще раз",
          });
        }
      } catch (error) {
        console.error("Error in server action:", error);
        toast.error("Произошла ошибка", {
          description: "Попробуйте еще раз",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finish setup (60 sec)</CardTitle>
        <CardDescription>
          Настройте основные параметры вашего ресторана
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, brand: e.target.value }))
              }
              placeholder="Название вашего ресторана"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="Адрес или название локации"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value: "EUR" | "USD") =>
                setFormData((prev) => ({ ...prev, currency: value }))
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите валюту" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isFormValid || isPending || isCompleted}
          >
            {isPending
              ? "Сохранение..."
              : isCompleted
              ? "Настройки сохранены"
              : "Сохранить настройки"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
