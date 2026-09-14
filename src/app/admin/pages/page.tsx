import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasRole, WRITE_ROLES } from "@/lib/rbac";

export default async function AdminPagesList() {
  const [pages, session] = await Promise.all([
    prisma.page.findMany({ orderBy: { updatedAt: "desc" } }),
    auth(),
  ]);
  const canWrite = hasRole(session?.user?.role, WRITE_ROLES);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pages</h1>
        {canWrite && (
          <Link
            href="/admin/pages/new"
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            New Page
          </Link>
        )}
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2">Title</th>
            <th className="py-2">Slug</th>
            <th className="py-2">Status</th>
            <th className="py-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id} className="border-b border-gray-100">
              <td className="py-2">
                <Link
                  href={`/admin/pages/${page.id}`}
                  className="hover:underline"
                >
                  {page.title}
                </Link>
              </td>
              <td className="py-2 text-gray-500">/{page.slug}</td>
              <td className="py-2">{page.status}</td>
              <td className="py-2 text-gray-500">
                {page.updatedAt.toLocaleDateString()}
              </td>
            </tr>
          ))}
          {pages.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-gray-400">
                No pages yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
