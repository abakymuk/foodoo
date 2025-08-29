"use client";

import * as React from "react";
import { useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrders, placeTestOrder } from "../actions/orders";
import { seedTestData } from "../actions/seed";
import { OrderItemsDisplay } from "@/components/order-items-display";
import { AddressDisplay } from "@/components/address-display";
import { CustomerDisplay } from "@/components/customer-display";
import { PaymentDisplay } from "@/components/payment-display";
import { AssigneeDisplay } from "@/components/assignee-display";
import { OrderDrawer } from "@/components/order-drawer";
import { toast } from "sonner";
import { Search } from "lucide-react";

type OrderItem = {
  id: string;
  item_name: string;
  qty: number;
  unit_price_cents: number;
};

type Order = {
  id: string;
  order_number: number;
  status: string;
  total_cents: number;
  is_test: boolean;
  order_type: string;
  payment_method: string;
  payment_status: string;
  customer_name?: string;
  customer_phone?: string;
  customer_comment?: string;
  delivery_address?: {
    street: string;
    city: string;
    zip: string;
    apt: string;
    lat: number;
    lon: number;
  };
  expected_at?: string;
  assignee_user_id?: string;
  courier_name?: string;
  courier_phone?: string;
  created_at: string;
  order_items: OrderItem[];
};

export default function OrdersPage() {
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalOrders, setTotalOrders] = React.useState(0);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(
    null
  );
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const loadOrders = async () => {
    setIsLoading(true);

    // Подготавливаем параметры для фильтрации
    const params: Record<string, string | number> = {
      page: currentPage,
      pageSize: 25,
    };

    if (searchTerm) params.q = searchTerm;
    if (statusFilter !== "all") params.status = statusFilter;
    if (typeFilter !== "all") params.type = typeFilter;

    // Фильтр по дате
    if (dateFilter !== "all") {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      switch (dateFilter) {
        case "today":
          params.from = today.toISOString().split("T")[0];
          params.to = today.toISOString().split("T")[0];
          break;
        case "yesterday":
          params.from = yesterday.toISOString().split("T")[0];
          params.to = yesterday.toISOString().split("T")[0];
          break;
        case "week":
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          params.from = weekAgo.toISOString();
          break;
      }
    }

    const result = await getOrders(params);
    if (result.ok && result.data) {
      setOrders(result.data.orders);
      // Обновляем пагинацию
      setTotalPages(result.data.pagination.totalPages);
      setTotalOrders(result.data.pagination.total);
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
        await loadOrders();
      } else {
        toast.error("Failed to place order", {
          description: result.error || "Please try again.",
        });
      }
    });
  };

  const onSeedTestData = () => {
    console.log("onSeedTestData called");
    startTransition(async () => {
      console.log("Starting seed transition...");
      const result = await seedTestData();
      console.log("Seed result:", result);
      if (result.ok) {
        toast.success("Test data seeded", {
          description: "15 orders with items and payments have been created.",
        });
        await loadOrders();
      } else {
        toast.error("Failed to seed test data", {
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

  const formatETA = (etaString?: string) => {
    if (!etaString) return "-";
    return new Date(etaString).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string, isTest: boolean) => {
    if (isTest) {
      return <Badge variant="secondary">Test</Badge>;
    }

    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "accepted":
        return <Badge variant="default">Accepted</Badge>;
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "en_route":
        return <Badge variant="default">En Route</Badge>;
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "canceled":
        return <Badge variant="destructive">Canceled</Badge>;
      case "paid_test":
        return <Badge variant="default">Paid (Test)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOrderTypeBadge = (orderType: string) => {
    switch (orderType) {
      case "pickup":
        return <Badge variant="secondary">Pickup</Badge>;
      case "delivery":
        return <Badge variant="secondary">Delivery</Badge>;
      default:
        return <Badge variant="outline">{orderType}</Badge>;
    }
  };

  // Обновляем заказы при изменении фильтров
  React.useEffect(() => {
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении фильтров
    loadOrders();
  }, [searchTerm, statusFilter, typeFilter, dateFilter]);

  // Обновляем заказы при изменении страницы
  React.useEffect(() => {
    loadOrders();
  }, [currentPage]);

  // Загружаем заказы при монтировании компонента
  React.useEffect(() => {
    loadOrders();
  }, []);

  // Обновляем заказы при изменении фильтров
  React.useEffect(() => {
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении фильтров
    loadOrders();
  }, [searchTerm, statusFilter, typeFilter, dateFilter]);

  // Обновляем заказы при изменении страницы
  React.useEffect(() => {
    loadOrders();
  }, [currentPage]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Orders"
        description="Manage your restaurant orders and track order status"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={onSeedTestData}
              disabled={isPending}
              variant="outline"
            >
              {isPending ? "Seeding..." : "Seed Test Data"}
            </Button>
            <Button onClick={onPlaceTestOrder} disabled={isPending}>
              {isPending ? "Placing..." : "Place Order"}
            </Button>
          </div>
        }
      />

      {/* Фильтры */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Order #, phone, name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="en_route">En Route</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица заказов */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading orders...</p>
          </CardContent>
        </Card>
      ) : orders.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px]">Type</TableHead>
                  <TableHead className="w-[150px]">Address</TableHead>
                  <TableHead className="w-[120px]">Customer</TableHead>
                  <TableHead className="w-[140px]">Items</TableHead>
                  <TableHead className="w-[80px]">Total</TableHead>
                  <TableHead className="w-[100px]">Payment</TableHead>
                  <TableHead className="w-[100px]">ETA</TableHead>
                  <TableHead className="w-[120px]">Assignee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setIsDrawerOpen(true);
                    }}
                  >
                    <TableCell className="font-medium text-sm">
                      #{order.order_number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status, order.is_test)}
                    </TableCell>
                    <TableCell>{getOrderTypeBadge(order.order_type)}</TableCell>
                    <TableCell>
                      <AddressDisplay
                        orderType={order.order_type}
                        deliveryAddress={order.delivery_address}
                      />
                    </TableCell>
                    <TableCell>
                      <CustomerDisplay
                        name={order.customer_name}
                        phone={order.customer_phone}
                        comment={order.customer_comment}
                      />
                    </TableCell>
                    <TableCell>
                      <OrderItemsDisplay items={order.order_items} />
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {formatPrice(order.total_cents)}
                    </TableCell>
                    <TableCell>
                      <PaymentDisplay
                        method={order.payment_method}
                        status={order.payment_status}
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatETA(order.expected_at)}
                    </TableCell>
                    <TableCell>
                      <AssigneeDisplay
                        name={order.courier_name}
                        phone={order.courier_phone}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ||
              statusFilter !== "all" ||
              typeFilter !== "all" ||
              dateFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Place your first test order to see it here."}
            </p>
            {!searchTerm &&
              statusFilter === "all" &&
              typeFilter === "all" &&
              dateFilter === "all" && (
                <Button onClick={onPlaceTestOrder} disabled={isPending}>
                  {isPending ? "Placing..." : "Place Order"}
                </Button>
              )}
          </div>
        </Card>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 25 + 1} to{" "}
            {Math.min(currentPage * 25, totalOrders)} of {totalOrders} orders
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Order Drawer */}
      <OrderDrawer
        orderId={selectedOrderId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedOrderId(null);
        }}
        onOrderUpdate={loadOrders}
      />
    </div>
  );
}
