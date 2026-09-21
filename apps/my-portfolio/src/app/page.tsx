import { getPage } from "@/lib/cms";

export default async function Home() {
  const page = await getPage("home");

  if (!page) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-2xl font-semibold">My Portfolio</h1>
        <p className="text-sm opacity-70">
          No published &quot;home&quot; page yet — create one in the CMS admin
          to fill this in.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-8 p-8">
      <h1 className="text-3xl font-semibold">{page.title}</h1>
      {page.blocks.map((block) => (
        <section key={block.id} className="rounded-lg border p-4">
          <p className="mb-2 text-xs font-medium tracking-wide uppercase opacity-60">
            {block.component.name}
          </p>
          <pre className="overflow-x-auto text-sm">
            {JSON.stringify(block.data, null, 2)}
          </pre>
        </section>
      ))}
    </main>
  );
}
