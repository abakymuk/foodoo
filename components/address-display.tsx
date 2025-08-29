"use client";

import { MapPin, Store } from "lucide-react";

interface AddressDisplayProps {
  orderType: string;
  deliveryAddress?: {
    street: string;
    city: string;
    zip: string;
    apt: string;
    lat: number;
    lon: number;
  };
  locationName?: string;
}

export function AddressDisplay({
  orderType,
  deliveryAddress,
  locationName,
}: AddressDisplayProps) {
  if (orderType === "pickup") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Store className="h-4 w-4 text-muted-foreground" />
        <span>{locationName || "Store · OOMI Kitchen"}</span>
      </div>
    );
  }

  if (deliveryAddress) {
    const addressParts = [
      deliveryAddress.street,
      deliveryAddress.apt && `Apt ${deliveryAddress.apt}`,
    ].filter(Boolean);

    return (
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{addressParts.join(", ")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <MapPin className="h-4 w-4" />
      <span>No address</span>
    </div>
  );
}
