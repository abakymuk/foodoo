"use client";

import * as React from "react";
import { useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrders, placeTestOrder } from "../actions/orders";
import { toast } from "sonner";

type Order = {
  id: string;
  status: string;
  total_cents: number;
  is_test: boolean;
  created_at: string;
};

export default function OrdersPage() {
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Загружаем заказы при монтировании компонента
  React.useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    const result = await getOrders();
    if (result.ok && result.data) {
      setOrders(result.data);
    }
    setIsLoading(false);
  };

  const onPlaceTestOrder = () => {
    startTransition(async () => {
      const result = await placeTestOrder();
      if (result.ok) {
        toast.success("Test order placed", {
          description: "Order has been created successfully.",
        });
        // Перезагружаем список заказов
        await loadOrders();
      } else {
        toast.error("Failed to place order", {
          description: result.error || "Please try again.",
        });
      }
    });
  };

  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string, isTest: boolean) => {
    if (isTest) {
      return <Badge variant="secondary">Test</Badge>;
    }

    switch (status) {
      case "paid_test":
        return <Badge variant="default">Paid (Test)</Badge>;
      case "created":
        return <Badge variant="outline">Created</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Orders"
        description="Manage your restaurant orders and track order status"
        actions={
          <Button onClick={onPlaceTestOrder} disabled={isPending}>
            {isPending ? "Placing..." : "Place Order"}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      ) : orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Order #{order.id.slice(0, 8)}
                  </CardTitle>
                  {getStatusBadge(order.status, order.is_test)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(order.total_cents)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">
              Place your first test order to see it here.
            </p>
            <Button onClick={onPlaceTestOrder} disabled={isPending}>
              {isPending ? "Placing..." : "Place Order"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
