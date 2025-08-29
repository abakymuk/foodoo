"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AppTopbarProps = {
  testMode?: boolean;
};

const LABELS: Record<string, string> = {
  "/app": "Dashboard",
  "/app/orders": "Orders",
  "/app/menu": "Menu",
  "/app/settings": "Settings",
};

export function AppTopbar({ testMode = true }: AppTopbarProps) {
  const pathname = usePathname();

  // формируем крошки из пути, оставляя только наши ключевые сегменты
  const crumbs = React.useMemo(() => {
    const parts = pathname?.split("/").filter(Boolean) ?? [];
    const acc: { href: string; label: string }[] = [];
    let running = "";
    for (const p of parts) {
      running += `/${p}`;
      if (LABELS[running]) {
        acc.push({ href: running, label: LABELS[running] });
      }
    }
    return acc.length ? acc : [{ href: "/app", label: "Dashboard" }];
  }, [pathname]);

  const last = crumbs[crumbs.length - 1]?.href;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((c, i) => (
            <React.Fragment key={c.href}>
              <BreadcrumbItem className="hidden sm:block">
                {c.href === last ? (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={c.href}>{c.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {i < crumbs.length - 1 && (
                <BreadcrumbSeparator className="hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        {testMode && (
          <span
            className="rounded-full border px-2 py-1 text-xs uppercase leading-none opacity-80"
            aria-label="Test mode is enabled"
            title="Test mode is enabled"
          >
            Test
          </span>
        )}
      </div>
    </header>
  );
}
