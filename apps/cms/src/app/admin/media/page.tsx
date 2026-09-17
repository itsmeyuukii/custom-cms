import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { uploadMedia } from "./actions";

export default async function AdminMediaLibrary() {
  const [media, session] = await Promise.all([
    prisma.media.findMany({ orderBy: { createdAt: "desc" } }),
    auth(),
  ]);

  const canUpload = await hasPermission(
    session?.user?.roleSlugs,
    "media:upload",
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Media</h1>

      {canUpload && (
        <form
          action={uploadMedia}
          className="mt-6 max-w-md space-y-3 rounded border border-gray-200 p-4"
        >
          <div>
            <label className="block text-sm font-medium">File</label>
            <input
              type="file"
              name="file"
              required
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="mt-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Alt text (optional)
            </label>
            <input
              name="alt"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            Upload
          </button>
        </form>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {media.map((item) => (
          <li
            key={item.id}
            className="rounded border border-gray-200 p-2 text-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.alt ?? item.filename}
              className="h-24 w-full rounded object-cover"
            />
            <div className="mt-2 truncate">{item.filename}</div>
            <input
              readOnly
              defaultValue={item.url}
              className="mt-1 w-full rounded border border-gray-200 px-1 py-0.5 text-[10px]"
            />
          </li>
        ))}
        {media.length === 0 && (
          <li className="text-sm text-gray-400">No media yet.</li>
        )}
      </ul>
    </div>
  );
}
