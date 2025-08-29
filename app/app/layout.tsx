import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { getCurrentUser } from "./actions/user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <AppTopbar testMode />
        <main className="px-4 pb-6 pt-2">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
