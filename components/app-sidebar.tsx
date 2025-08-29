"use client";

import type * as React from "react";
import { BookOpen, Bot, Clover, Settings2, SquareTerminal } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { SidebarThemeToggle } from "@/components/sidebar-theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Vlad Ovelian",
    email: "vlad@yahoo.com",
    avatar: "/bearded-man-face-photo.png",
  },
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: false,
    },
    {
      title: "Orders",
      url: "/orders",
      icon: Bot,
      isActive: false,
    },
    {
      title: "Menus",
      url: "/menus",
      icon: BookOpen,
      items: [
        {
          title: "Categories",
          url: "/menus/categories",
        },
        {
          title: "Items",
          url: "/menus/items",
        },
        {
          title: "Modifiers",
          url: "/menus/modifiers",
        },
      ],
    },
    {
      title: "Marketing",
      url: "/marketing",
      icon: Settings2,
      items: [
        {
          title: "Promo & Discounts",
          url: "/marketing/promotions",
        },
        {
          title: "Loyalty",
          url: "/marketing/loyalty",
        },
        {
          title: "Push Notifications",
          url: "/marketing/push",
        },
        {
          title: "SMS",
          url: "/marketing/sms",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Clover className="size-4 text-green-500" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Potlucky</span>
                  <span className="truncate text-xs">OOMI Kitchen</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarThemeToggle />
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
