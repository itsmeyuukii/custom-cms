import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { createPage } from "../actions";

export default async function NewPage() {
  const session = await auth();
  if (!(await hasPermission(session?.user?.roleSlugs, "pages:create")))
    redirect("/admin/pages");

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-zinc-900">New Page</h1>
      <form action={createPage} className="mt-6">
        <FieldGroup>
          <Field>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </Field>
          <Field>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9\-]+"
              placeholder="about-us"
            />
          </Field>
        </FieldGroup>
        <Button type="submit" className="mt-6">
          Create
        </Button>
      </form>
    </div>
  );
}
