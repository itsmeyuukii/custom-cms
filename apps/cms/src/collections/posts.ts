// Posts as a Collection (docs/COLLECTIONS_PLAN.md §2 example, §4 phase 6)
// — the first real collection, replacing the hand-written Post Prisma
// model. Reuses the already-seeded posts:* permission keys rather than a
// parallel collection:posts:* taxonomy, per the access-shape note in
// COLLECTIONS_PLAN.md §2.

import type { CollectionConfig } from "./types";

export const posts: CollectionConfig = {
  slug: "posts",
  label: "Post",
  labelPlural: "Posts",
  slugField: "slug",
  access: {
    read: "public",
    create: ["posts:create"],
    update: ["posts:edit"],
    delete: ["posts:delete"],
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "excerpt", type: "textarea" },
    { name: "body", type: "richText", required: true },
    { name: "publishedAt", type: "date" },
  ],
};
