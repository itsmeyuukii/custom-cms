import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { Navbar } from "@/components/ui/navbar";
import { Sidebar, SidebarItem, SidebarSection } from "@/components/ui/sidebar";
import { SidebarLayout } from "@/components/ui/sidebar-layout";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const canManageRoles = await hasPermission(
    session?.user?.roleSlugs,
    "roles:manage",
  );
  const canManageUsers = await hasPermission(
    session?.user?.roleSlugs,
    "users:manage",
  );

  return (
    <SidebarLayout
      navbar={<Navbar userName={session?.user?.name} />}
      sidebar={
        <Sidebar>
          <div className="px-3 text-lg font-semibold text-zinc-900">Admin</div>
          <SidebarSection>
            <SidebarItem href="/admin">Dashboard</SidebarItem>
            <SidebarItem href="/admin/pages">Pages</SidebarItem>
            <SidebarItem href="/admin/posts">Posts</SidebarItem>
            <SidebarItem href="/admin/media">Media</SidebarItem>
            {canManageRoles && (
              <SidebarItem href="/admin/roles">Roles</SidebarItem>
            )}
            {canManageUsers && (
              <SidebarItem href="/admin/users">Users</SidebarItem>
            )}
          </SidebarSection>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
