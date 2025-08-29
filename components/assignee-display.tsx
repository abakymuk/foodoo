"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AssigneeDisplayProps {
  name?: string;
  phone?: string;
}

export function AssigneeDisplay({ name, phone }: AssigneeDisplayProps) {
  if (!name) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{name}</div>
        {phone && <div className="text-xs text-muted-foreground">{phone}</div>}
      </div>
    </div>
  );
}
