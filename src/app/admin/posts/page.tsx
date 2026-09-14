import { prisma } from "@/lib/prisma";

export default async function AdminPostsList() {
  const posts = await prisma.post.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Posts</h1>
      <p className="mt-2 text-sm text-gray-500">
        Post creation UI is not built yet — this lists existing posts only.
      </p>

      <ul className="mt-6 space-y-2 text-sm">
        {posts.map((post) => (
          <li key={post.id} className="rounded border border-gray-200 p-3">
            <span className="font-medium">{post.title}</span>{" "}
            <span className="text-gray-400">({post.status})</span>
          </li>
        ))}
        {posts.length === 0 && <li className="text-gray-400">No posts yet.</li>}
      </ul>
    </div>
  );
}
