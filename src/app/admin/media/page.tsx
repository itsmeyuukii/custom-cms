import { prisma } from "@/lib/prisma";

export default async function AdminMediaLibrary() {
  const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Media</h1>
      <p className="mt-2 text-sm text-gray-500">
        Upload UI is not built yet — this lists existing media records only.
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {media.map((item) => (
          <li key={item.id} className="rounded border border-gray-200 p-2 text-xs">
            <div className="truncate">{item.filename}</div>
          </li>
        ))}
        {media.length === 0 && <li className="text-sm text-gray-400">No media yet.</li>}
      </ul>
    </div>
  );
}
