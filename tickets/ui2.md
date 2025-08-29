

1) components/app-topbar.tsx

Минималистичный топбар: триггер сайдбара, разделитель, хлебные крошки и бейдж Test Mode.

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
import {
  SidebarTrigger,
} from "@/components/ui/sidebar";

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


⸻

2) components/page-header.tsx

Универсальный заголовок страницы с описанием и экшенами справа.

import * as React from "react";

type PageHeaderProps = {
  title: string;
  description?: string | React.ReactNode;
  actions?: React.ReactNode; // кнопки/меню справа
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}


⸻

3) Подключаем в layout: app/(app)/layout.tsx

Вставляем Topbar над контентом (у тебя уже есть SidebarInset — просто добавим Topbar).

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar testMode />
        <main className="px-4 pb-6 pt-2">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}


⸻

4) Пример дашборда с кнопкой “Place test order”

Кнопка вызывает server action; показываем лоадер и тосты.

4.1 Server action: app/(app)/actions/orders.ts

"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function placeTestOrder() {
  // Supabase серверный клиент
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Находим tenant текущего пользователя (Stage-0: 1:1)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!tenant) {
    return { ok: false, error: "No tenant found" };
  }

  const { error: insertErr } = await supabase.from("orders").insert({
    tenant_id: tenant.id,
    status: "paid_test",
    total_cents: 100,
    is_test: true,
  });

  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  return { ok: true };
}

4.2 Страница: app/(app)/page.tsx

"use client";

import * as React from "react";
import { useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { placeTestOrder } from "./actions/orders";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const onPlaceTestOrder = () => {
    startTransition(async () => {
      const res = await placeTestOrder();
      if (res.ok) {
        toast({ title: "Test order placed", description: "Check Orders page." });
      } else {
        toast({
          title: "Failed to place order",
          description: res.error ?? "Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Dashboard"
        description="Finish setup and try a full order flow in test mode."
        actions={
          <Button onClick={onPlaceTestOrder} disabled={isPending}>
            {isPending ? "Placing..." : "Place test order"}
          </Button>
        }
      />

      {/* Пример простой карточки «Quickstart» (опционально) */}
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Tip: Create a sample menu to see your flow end-to-end.
        </p>
      </Card>
    </div>
  );
}


⸻

5) Быстрый чек-лист, чтобы всё завелось
	•	Добавь шадсины, если ещё нет: button, breadcrumb, separator, card, toast.
	•	Проверь таблицы tenants и orders + RLS (как мы описывали ранее).
	•	Убедись, что дефолтный tenant создаётся при первом “Quickstart” (или создай вручную для теста).
	•	Подключи ToastProvider в корневом layout, если ещё нет.

