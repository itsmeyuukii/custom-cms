import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Text } from "@/components/ui/text";
import { uploadMedia, deleteMedia } from "./actions";

export default async function AdminMediaLibrary() {
  const [media, session] = await Promise.all([
    prisma.media.findMany({ orderBy: { createdAt: "desc" } }),
    auth(),
  ]);

  const [canUpload, canDelete] = await Promise.all([
    hasPermission(session?.user?.roleSlugs, "media:upload"),
    hasPermission(session?.user?.roleSlugs, "media:delete"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Media</h1>

      {canUpload && (
        <form
          action={uploadMedia}
          className="mt-6 max-w-md space-y-3 rounded-lg border border-zinc-200 p-4"
        >
          <FieldGroup>
            <Field>
              <Label htmlFor="file">File</Label>
              <input
                id="file"
                type="file"
                name="file"
                required
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-200"
              />
            </Field>
            <Field>
              <Label htmlFor="alt">Alt text (optional)</Label>
              <Input id="alt" name="alt" />
            </Field>
          </FieldGroup>
          <Button type="submit">Upload</Button>
        </form>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {media.map((item) => (
          <li key={item.id} className="rounded-lg border border-zinc-200 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.alt ?? item.filename}
              className="h-24 w-full rounded-md object-cover"
            />
            <div className="mt-2 truncate text-xs text-zinc-900">
              {item.filename}
            </div>
            <Input readOnly defaultValue={item.url} className="mt-1 text-xs" />
            {canDelete && (
              <form action={deleteMedia.bind(null, item.id)} className="mt-1">
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </form>
            )}
          </li>
        ))}
        {media.length === 0 && (
          <li>
            <Text>No media yet.</Text>
          </li>
        )}
      </ul>
    </div>
  );
}
