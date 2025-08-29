"use client";

import * as React from "react";
import { useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSampleMenu, getMenuItems } from "../actions/menu";
import { toast } from "sonner";

type MenuItem = {
  id: string;
  name: string;
  price_cents: number;
  is_active: boolean;
};

export default function MenuPage() {
  const [isPending, startTransition] = useTransition();
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Загружаем menu items при монтировании компонента
  React.useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    setIsLoading(true);
    const result = await getMenuItems();
    if (result.ok && result.data) {
      setMenuItems(result.data);
    }
    setIsLoading(false);
  };

  const onCreateSampleMenu = () => {
    startTransition(async () => {
      const result = await createSampleMenu();
      if (result.ok) {
        toast.success("Sample menu created", {
          description: "3 items have been added to your menu.",
        });
        // Перезагружаем список
        await loadMenuItems();
      } else {
        toast.error("Failed to create sample menu", {
          description: result.error || "Please try again.",
        });
      }
    });
  };

  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(2)}`;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Menu"
        description="Manage your restaurant menu items"
        actions={
          <Button onClick={onCreateSampleMenu} disabled={isPending}>
            {isPending ? "Creating..." : "Create sample menu"}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading menu items...</p>
        </div>
      ) : menuItems.length > 0 ? (
        <div className="grid gap-4">
          {menuItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(item.price_cents)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.is_active ? "Active" : "Inactive"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No items yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first item or Create sample menu.
            </p>
            <Button onClick={onCreateSampleMenu} disabled={isPending}>
              {isPending ? "Creating..." : "Create sample menu"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
