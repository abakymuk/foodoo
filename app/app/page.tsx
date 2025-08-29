"use client";

import * as React from "react";
import { useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { placeTestOrder } from "./actions/orders";
import { getDashboardMetrics } from "./actions/metrics";
import { toast } from "sonner";
import { QuickstartForm } from "@/components/quickstart-form";

export default function DashboardPage() {
  const [isPending, startTransition] = useTransition();
  const [isSetupCompleted, setIsSetupCompleted] = React.useState(false);
  const [metrics, setMetrics] = React.useState({ todayOrders: 0 });
  const [isLoadingMetrics, setIsLoadingMetrics] = React.useState(true);

  const onPlaceTestOrder = () => {
    startTransition(async () => {
      const res = await placeTestOrder();
      if (res.ok) {
        toast.success("Test order placed", {
          description: "Check Orders page.",
        });
        // Перенаправляем на страницу заказов
        window.location.href = "/app/orders";
      } else {
        toast.error("Failed to place order", {
          description: "Please try again.",
        });
      }
    });
  };

  const onCreateSampleMenu = () => {
    // Перенаправляем на страницу меню
    window.location.href = "/app/menu";
  };

  // Загружаем метрики при монтировании компонента
  React.useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoadingMetrics(true);
    const result = await getDashboardMetrics();
    if (result.ok && result.data) {
      setMetrics(result.data);
    }
    setIsLoadingMetrics(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Dashboard"
        description="Finish setup and try a full order flow in test mode."
        actions={
          <div className="flex gap-2">
            <Button
              onClick={onCreateSampleMenu}
              disabled={!isSetupCompleted}
              variant="outline"
            >
              Create sample menu
            </Button>
            <Button
              onClick={onPlaceTestOrder}
              disabled={!isSetupCompleted || isPending}
            >
              {isPending ? "Placing..." : "Place test order"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6">
        {/* Метрики */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingMetrics ? "..." : metrics.todayOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                Orders placed today
              </p>
            </CardContent>
          </Card>
        </div>

        <QuickstartForm onComplete={() => setIsSetupCompleted(true)} />

        {isSetupCompleted && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              ✅ Setup completed! You can now create menus and place orders.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
