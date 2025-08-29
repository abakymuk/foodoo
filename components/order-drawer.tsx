"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { getOrderById, updateOrder } from "@/app/app/actions/orders";
import { toast } from "sonner";
import { useTransition } from "react";
import { MapPin, Store, User, Phone, MessageSquare } from "lucide-react";

type OrderItem = {
  id: string;
  item_id?: string;
  item_name: string;
  qty: number;
  unit_price_cents: number;
  modifiers?: Array<{ name: string; value: string }>;
  subtotal_cents: number;
};

type Payment = {
  id: string;
  provider: string;
  provider_ref?: string;
  amount_cents: number;
  status: string;
  is_test: boolean;
  created_at: string;
};

type Order = {
  id: string;
  order_number: number;
  status: string;
  total_cents: number;
  items_total_cents: number;
  tax_cents: number;
  service_fee_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
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
  channel?: string;
  created_at: string;
  order_items: OrderItem[];
  payments: Payment[];
};

interface OrderDrawerProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate?: () => void;
}

export function OrderDrawer({
  orderId,
  isOpen,
  onClose,
  onOrderUpdate,
}: OrderDrawerProps) {
  const [order, setOrder] = React.useState<Order | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUpdating, startUpdateTransition] = useTransition();
  const [editableFields, setEditableFields] = React.useState({
    status: "",
    expected_at: "",
    courier_name: "",
    courier_phone: "",
    payment_status: "",
  });
  const [isCashPaid, setIsCashPaid] = React.useState(false);

  // Загружаем данные заказа при открытии
  React.useEffect(() => {
    if (isOpen && orderId) {
      loadOrder();
    }
  }, [isOpen, orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    setIsLoading(true);
    const result = await getOrderById(orderId);
    if (result.ok && result.data) {
      setOrder(result.data);
      setEditableFields({
        status: result.data.status,
        expected_at: result.data.expected_at
          ? new Date(result.data.expected_at).toISOString().slice(0, 16)
          : "",
        courier_name: result.data.courier_name || "",
        courier_phone: result.data.courier_phone || "",
        payment_status: result.data.payment_status || "",
      });
      setIsCashPaid(result.data.payment_status === "paid");
    } else {
      toast.error("Failed to load order", {
        description: result.error || "Please try again.",
      });
    }
    setIsLoading(false);
  };

  const handleUpdate = () => {
    if (!orderId) return;

    startUpdateTransition(async () => {
      const updates: Record<string, string | null> = {};

      if (editableFields.status !== order?.status) {
        updates.status = editableFields.status;
      }
      if (
        editableFields.expected_at !==
        (order?.expected_at
          ? new Date(order.expected_at).toISOString().slice(0, 16)
          : "")
      ) {
        updates.expected_at = editableFields.expected_at
          ? new Date(editableFields.expected_at).toISOString()
          : null;
      }
      if (editableFields.courier_name !== order?.courier_name) {
        updates.courier_name = editableFields.courier_name;
      }
      if (editableFields.courier_phone !== order?.courier_phone) {
        updates.courier_phone = editableFields.courier_phone;
      }

      // Обработка наличных платежей
      if (order?.payment_method === "cash" && isCashPaid) {
        updates.payment_status = "paid";
      }

      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        return;
      }

      const result = await updateOrder(orderId, updates);
      if (result.ok) {
        toast.success("Order updated", {
          description: "Order has been updated successfully.",
        });
        await loadOrder();
        onOrderUpdate?.();
      } else {
        toast.error("Failed to update order", {
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

  const getAvailableStatuses = (currentStatus: string, orderType: string) => {
    const allStatuses = [
      { value: "pending", label: "Pending" },
      { value: "accepted", label: "Accepted" },
      { value: "in_progress", label: "In Progress" },
      { value: "ready", label: "Ready" },
      { value: "en_route", label: "En Route" },
      { value: "completed", label: "Completed" },
      { value: "canceled", label: "Canceled" },
    ];

    // Разрешенные переходы
    const allowedTransitions: Record<string, string[]> = {
      pending: ["accepted", "canceled"],
      accepted: ["in_progress", "canceled"],
      in_progress: ["ready", "en_route", "canceled"],
      ready: ["completed", "canceled"],
      en_route: ["completed", "canceled"],
      completed: [],
      canceled: [],
    };

    const allowedNextStatuses = allowedTransitions[currentStatus] || [];

    return allStatuses.filter((status) => {
      // Показываем текущий статус и разрешенные переходы
      if (status.value === currentStatus) return true;
      if (allowedNextStatuses.includes(status.value)) return true;

      // Специальные правила для разных типов заказов
      if (status.value === "ready" && orderType === "delivery") return false;
      if (status.value === "en_route" && orderType === "pickup") return false;

      return false;
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

  if (!order && !isLoading) {
    return null;
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle>
              {isLoading ? "Loading..." : `Order #${order?.order_number}`}
            </DrawerTitle>
            <DrawerDescription>
              {order && formatDate(order.created_at)}
            </DrawerDescription>
          </DrawerHeader>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading order details...</p>
            </div>
          ) : order ? (
            <div className="p-6 space-y-6">
              {/* Статус и основная информация */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status, order.is_test)}
                  <Badge variant="secondary" className="capitalize">
                    {order.order_type}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {formatPrice(order.total_cents)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Channel: {order.channel || "web"}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Клиент */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {order.customer_name || "Anonymous"}
                    </span>
                    {order.customer_comment && (
                      <div className="relative">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {order.customer_comment}
                        </div>
                      </div>
                    )}
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {order.customer_phone}
                    </div>
                  )}
                  {order.customer_comment && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {order.customer_comment}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Адрес */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  {order.order_type === "pickup" ? (
                    <Store className="h-4 w-4" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  {order.order_type === "pickup"
                    ? "Pickup Location"
                    : "Delivery Address"}
                </h3>
                {order.order_type === "pickup" ? (
                  <div className="text-sm">Store · OOMI Kitchen</div>
                ) : order.delivery_address ? (
                  <div className="text-sm space-y-1">
                    <div>{order.delivery_address.street}</div>
                    <div>
                      {order.delivery_address.city},{" "}
                      {order.delivery_address.zip}
                    </div>
                    {order.delivery_address.apt && (
                      <div>Apt {order.delivery_address.apt}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No address provided
                  </div>
                )}
              </div>

              <Separator />

              {/* Позиции заказа */}
              <div className="space-y-3">
                <h3 className="font-semibold">Order Items</h3>
                <div className="space-y-2">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center py-2 border-b border-muted last:border-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {item.qty}x {item.item_name}
                        </div>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {item.modifiers.map((mod, index) => (
                              <span key={index}>
                                {mod.name}: {mod.value}
                                {index < (item.modifiers?.length || 0) - 1
                                  ? ", "
                                  : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="font-medium">
                        {formatPrice(item.subtotal_cents)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Итоги */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Items Total:</span>
                    <span>{formatPrice(order.items_total_cents)}</span>
                  </div>
                  {order.tax_cents > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatPrice(order.tax_cents)}</span>
                    </div>
                  )}
                  {order.delivery_fee_cents > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>{formatPrice(order.delivery_fee_cents)}</span>
                    </div>
                  )}
                  {order.discount_cents > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatPrice(order.discount_cents)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatPrice(order.total_cents)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Платежи */}
              {order.payments && order.payments.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Payments</h3>
                    <div className="space-y-2">
                      {order.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex justify-between items-center py-2 border-b border-muted last:border-0"
                        >
                          <div>
                            <div className="font-medium capitalize">
                              {payment.provider}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {payment.provider_ref &&
                                `Ref: ${payment.provider_ref}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatPrice(payment.amount_cents)}
                            </div>
                            <Badge
                              variant={
                                payment.status === "paid"
                                  ? "default"
                                  : payment.status === "unpaid"
                                  ? "outline"
                                  : "destructive"
                              }
                              className="text-xs"
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Редактируемые поля */}
              <div className="space-y-4">
                <h3 className="font-semibold">Edit Order</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={editableFields.status}
                      onValueChange={(value) =>
                        setEditableFields((prev) => ({
                          ...prev,
                          status: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {order &&
                          getAvailableStatuses(
                            order.status,
                            order.order_type
                          ).map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expected_at">Expected Time</Label>
                    <Input
                      id="expected_at"
                      type="datetime-local"
                      value={editableFields.expected_at}
                      onChange={(e) =>
                        setEditableFields((prev) => ({
                          ...prev,
                          expected_at: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="courier_name">Courier Name</Label>
                    <Input
                      id="courier_name"
                      value={editableFields.courier_name}
                      onChange={(e) =>
                        setEditableFields((prev) => ({
                          ...prev,
                          courier_name: e.target.value,
                        }))
                      }
                      placeholder="Courier name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courier_phone">Courier Phone</Label>
                    <Input
                      id="courier_phone"
                      value={editableFields.courier_phone}
                      onChange={(e) =>
                        setEditableFields((prev) => ({
                          ...prev,
                          courier_phone: e.target.value,
                        }))
                      }
                      placeholder="+7..."
                    />
                  </div>
                </div>

                {/* Чекбокс для наличных платежей */}
                {order?.payment_method === "cash" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cash-paid"
                      checked={isCashPaid}
                      onCheckedChange={(checked) =>
                        setIsCashPaid(checked as boolean)
                      }
                    />
                    <Label htmlFor="cash-paid" className="text-sm">
                      Cash payment received
                    </Label>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DrawerFooter>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? "Updating..." : "Update Order"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
