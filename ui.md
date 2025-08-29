"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clover,
  LayoutDashboard,
  ShoppingBasket,
  ReceiptText,
  Settings2,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { SidebarThemeToggle } from "@/components/sidebar-theme-toggle";

// Props для гибкости: прогресс онбординга и флаг тест-режима
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  orgName?: string;
  orgSubtitle?: string;
  setupProgress?: number; // 0..100
  testMode?: boolean;
  user?: { name: string; email: string; avatar?: string };
};

export function AppSidebar({
  orgName = "Potlucky",
  orgSubtitle = "My Restaurant",
  setupProgress = 0,
  testMode = true,
  user = {
    name: "Vlad Ovelian",
    email: "vlad@yahoo.com",
    avatar: "/bearded-man-face-photo.png",
  },
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();

  // Мини-навигация для Stage-0
  const navMain = [
    {
      title: "Dashboard",
      url: "/app",
      icon: LayoutDashboard,
      isActive: isActive(pathname, "/app"),
    },
    {
      title: "Orders",
      url: "/app/orders",
      icon: ReceiptText,
      isActive: isActive(pathname, "/app/orders"),
    },
    {
      title: "Menu",
      url: "/app/menu",
      icon: ShoppingBasket,
      // если позже появятся подстраницы: items, categories, modifiers
      items: [
        { title: "Items", url: "/app/menu" },
        // { title: "Categories", url: "/app/menu/categories" },
        // { title: "Modifiers", url: "/app/menu/modifiers" },
      ],
      isActive:
        isActive(pathname, "/app/menu") ||
        pathname.startsWith("/app/menu/"),
    },
    {
      title: "Settings",
      url: "/app/settings",
      icon: Settings2,
      isActive: isActive(pathname, "/app/settings"),
    },
  ];

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/app" aria-label="Go to dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Clover className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{orgName}</span>
                    {testMode && (
                      <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase opacity-80">
                        Test
                      </span>
                    )}
                  </div>
                  <span className="truncate text-xs">{orgSubtitle}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Progress карточка онбординга — показываем, пока < 100% */}
        {setupProgress < 100 && (
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium">
                    Finish setup
                  </span>
                  <span className="text-xs tabular-nums">
                    {Math.max(0, Math.min(100, setupProgress))}%
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded bg-muted"
                  aria-hidden="true"
                >
                  <div
                    className="h-full w-0 rounded bg-foreground transition-[width] duration-300"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, setupProgress)
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-2">
                  <Link
                    href="/onboarding/welcome"
                    className="text-xs underline opacity-80 hover:opacity-100"
                  >
                    Continue onboarding
                  </Link>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarThemeToggle />
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

// helper: активен ли пункт навигации
function isActive(pathname: string | null, url: string) {
  if (!pathname) return false;
  if (url === "/app") {
    // Dashboard считаем активным только на /app (не на подстраницах)
    return pathname === "/app";
  }
  return pathname === url || pathname.startsWith(url + "/");
}

что поменялось и почему
	•	Навигация урезана до нужного минимума (не отвлекаем пользователя от первичного флоу).
	•	Активные пункты считаются от usePathname() → корректная подсветка и aria для доступности.
	•	Прогресс онбординга встроен в шапку сайдбара: видно сразу, и есть CTA «Continue onboarding».
	•	Test Mode pill у бренда — всегда понятно, что сейчас тестовая среда.
	•	Next <Link> вместо <a> — корретный SPA-переход и префетч.

