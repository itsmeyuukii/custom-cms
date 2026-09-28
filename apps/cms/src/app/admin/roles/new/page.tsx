import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { createRole } from "../actions";

export default async function NewRole() {
  const session = await auth();
  if (!(await hasPermission(session?.user?.roleSlugs, "roles:manage")))
    redirect("/admin/roles");

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-zinc-900">New Role</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Starts with no permissions — add them on the next screen.
      </p>
      <form action={createRole} className="mt-6">
        <FieldGroup>
          <Field>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Marketing" />
          </Field>
          <Field>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9\-]+"
              placeholder="marketing"
            />
          </Field>
          <Field>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} />
          </Field>
        </FieldGroup>
        <Button type="submit" className="mt-6">
          Create
        </Button>
      </form>
    </div>
  );
}
