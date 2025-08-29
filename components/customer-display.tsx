"use client";

import { MessageSquare } from "lucide-react";

interface CustomerDisplayProps {
  name?: string;
  phone?: string;
  comment?: string;
}

export function CustomerDisplay({
  name,
  phone,
  comment,
}: CustomerDisplayProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 group">
        <span className="font-medium text-sm">{name || "Anonymous"}</span>
        {comment && (
          <div className="relative">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {comment}
            </div>
          </div>
        )}
      </div>
      {phone && <div className="text-xs text-muted-foreground">{phone}</div>}
    </div>
  );
}
