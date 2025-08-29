"use client";

import { Badge } from "@/components/ui/badge";

type OrderItem = {
  id: string;
  item_name: string;
  qty: number;
  unit_price_cents: number;
};

interface OrderItemsDisplayProps {
  items: OrderItem[];
  maxDisplay?: number;
}

export function OrderItemsDisplay({
  items,
  maxDisplay = 2,
}: OrderItemsDisplayProps) {
  if (!items || items.length === 0) {
    return <span className="text-muted-foreground">No items</span>;
  }

  const displayItems = items.slice(0, maxDisplay);
  const remainingCount = items.length - maxDisplay;

  return (
    <div className="space-y-1">
      {displayItems.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1 text-sm">
          <span className="font-medium">{item.item_name}</span>
          <span className="text-muted-foreground">×{item.qty}</span>
          {index === 0 && remainingCount > 0 && (
            <Badge variant="secondary" className="text-xs ml-1">
              +{remainingCount}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
