import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createRole } from "../actions";

export default async function NewRole() {
  const session = await auth();
  if (!(await hasPermission(session?.user?.roleSlugs, "roles:manage")))
    redirect("/admin/roles");

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">New Role</h1>
      <p className="mt-2 text-sm text-gray-500">
        Starts with no permissions — add them on the next screen.
      </p>
      <form action={createRole} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            name="name"
            required
            placeholder="Marketing"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9\-]+"
            placeholder="marketing"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            rows={2}
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
