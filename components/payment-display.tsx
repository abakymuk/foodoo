"use client";

import { Badge } from "@/components/ui/badge";

interface PaymentDisplayProps {
  method: string;
  status: string;
}

export function PaymentDisplay({ method, status }: PaymentDisplayProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "unpaid":
        return "outline";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm capitalize">{method}</span>
      <Badge variant={getStatusVariant(status)} className="text-xs">
        {status}
      </Badge>
    </div>
  );
}
