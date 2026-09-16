import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

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
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-gray-200 p-4">
        <h2 className="mb-4 font-semibold">Admin</h2>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/pages">Pages</Link>
          <Link href="/admin/posts">Posts</Link>
          <Link href="/admin/media">Media</Link>
          {canManageRoles && <Link href="/admin/roles">Roles</Link>}
          {canManageUsers && <Link href="/admin/users">Users</Link>}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
