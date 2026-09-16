import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createPage } from "../actions";

export default async function NewPage() {
  const session = await auth();
  if (!(await hasPermission(session?.user?.roleSlugs, "pages:create")))
    redirect("/admin/pages");

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">New Page</h1>
      <form action={createPage} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            name="title"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9\-]+"
            placeholder="about-us"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          Create
        </button>
      </form>
    </div>
  );
}
