import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { addBlock, setPageStatus } from "../actions";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [page, components] = await Promise.all([
    prisma.page.findUnique({
      where: { id },
      include: {
        blocks: { orderBy: { order: "asc" }, include: { component: true } },
      },
    }),
    prisma.component.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!page) notFound();

  const addBlockToPage = addBlock.bind(null, page.id);

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">{page.title}</h1>
        <p className="text-sm text-gray-500">
          /{page.slug} · <span className="font-medium">{page.status}</span>
        </p>
      </div>

      <div className="mt-2 flex gap-2">
        {(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((status) => (
          <form key={status} action={setPageStatus.bind(null, page.id, status)}>
            <button
              type="submit"
              disabled={page.status === status}
              className="rounded border border-gray-300 px-3 py-1 text-xs disabled:opacity-40"
            >
              Set {status}
            </button>
          </form>
        ))}
      </div>

      <h2 className="mt-8 font-semibold">Blocks</h2>
      <ul className="mt-2 space-y-2">
        {page.blocks.map((block) => (
          <li key={block.id} className="rounded border border-gray-200 p-3 text-sm">
            <span className="font-medium">{block.component.name}</span>
            <pre className="mt-1 overflow-x-auto text-xs text-gray-500">
              {JSON.stringify(block.data, null, 2)}
            </pre>
          </li>
        ))}
        {page.blocks.length === 0 && (
          <li className="text-sm text-gray-400">No blocks yet.</li>
        )}
      </ul>

      <h2 className="mt-8 font-semibold">Add Block</h2>
      <form action={addBlockToPage} className="mt-2 space-y-3">
        <div>
          <label className="block text-sm font-medium">Component</label>
          <select
            name="componentId"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Data (JSON)</label>
          <textarea
            name="data"
            rows={5}
            defaultValue="{}"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs"
          />
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
          Add Block
        </button>
      </form>

      {page.status === "PUBLISHED" && (
        <Link
          href={`/${page.slug}`}
          target="_blank"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          View live →
        </Link>
      )}
    </div>
  );
}
