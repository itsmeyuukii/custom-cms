# RBAC v2 — Database-Driven Roles & Permissions

**Status: design only, nothing in this doc is implemented yet.** This
supersedes the RBAC built in the previous pass (see
[SECURITY_REVIEW.md](SECURITY_REVIEW.md) findings #1/#2) — that version
is real and working, just hardcoded to three fixed roles. This plan
replaces "fixed roles in code" with "roles as data an admin manages."

## The core distinction this design rests on

Two things are easy to conflate, so naming them precisely up front:

- **Permissions** — fixed, defined by developers, one per capability the
  app actually has code for (`pages:publish`, `media:upload`, ...). You
  don't get a new permission by clicking a button in the admin UI; you
  get one when a developer ships a feature that checks for it. This list
  grows slowly, alongside the codebase.
- **Roles** — fully dynamic. A named, admin-creatable bundle of
  permissions ("Marketing" = `pages:create` + `pages:edit` +
  `media:upload`, nothing else). This is exactly the "department" idea —
  a department is just a role with a business-meaningful name instead of
  a generic one. Creating "Marketing" and deciding what it can touch both
  happen from the admin UI, no code change required.

This is the standard shape of real-world RBAC (AWS IAM policies bundle
fixed permissions into named roles; WordPress capabilities get bundled
into named roles the same way) — it's what makes "create a department
and decide what it can access" possible without a deploy for every new
team.

A user can hold **multiple roles at once** (e.g. "Marketing" +
"Editor"), so this single dimension also covers wanting both a
department and a seniority-style role — no separate second axis needed.

## 1. Data model

Replaces the `Role` enum and `User.role` field entirely.

```prisma
model Permission {
  id          String @id @default(cuid())
  key         String @unique   // "pages:publish" — resource:action
  label       String            // "Publish pages" — for the admin UI
  group       String            // "Pages" — groups checkboxes in the UI

  roles RolePermission[]
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique   // "Marketing", "Admin", "Editor"
  slug        String   @unique   // "marketing" — stable identifier, used in code/seeds
  description String?
  isSystem    Boolean  @default(false) // seeded roles (Admin) can't be deleted

  permissions RolePermission[]
  users       UserRole[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model RolePermission {
  roleId       String
  permissionId String

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

model UserRole {
  userId String
  roleId String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}
```

`User.role Role @default(VIEWER)` (the old enum field) is removed; `User`
gets a `roles UserRole[]` relation instead.

## 2. Permission key taxonomy

`resource:action`, lowercase, colon-separated — matches the pattern
already used for `pages:*` implicitly in the current codebase. Seeded at
launch, covering what already exists:

```
pages:create   pages:edit   pages:publish   pages:delete
posts:create   posts:edit   posts:publish   posts:delete
media:upload   media:delete
roles:manage           // create/edit roles and their permissions
users:manage            // assign roles to users
```

Every future feature (Collections, once
[COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md) lands) adds its own keys the
same way — likely `collection:<slug>:create/read/update/delete` per
collection, generated alongside each `CollectionConfig`.

## 3. Session strategy — what goes in the JWT vs. what's looked up fresh

This is the one real tradeoff in this design, worth being deliberate
about rather than defaulting blindly:

- **Role assignments** (which roles a user has) change rarely. Fine to
  bake the user's role **slugs** into the JWT at login, same as the
  current `token.role` does today. Changing a user's roles requires them
  to log in again to see the change — acceptable.
- **What a role can do** (its permissions) changes more often — that's
  the whole point of this system, an admin tuning access on the fly.
  Baking resolved permissions into the JWT would mean "Marketing can no
  longer publish" doesn't take effect for already-logged-in Marketing
  users until their token expires, which defeats the purpose of making
  this admin-configurable. So: **look up a role's current permissions
  from the database on every check**, keyed off the role slugs already
  in the JWT (`WHERE role.slug IN (...)`, one indexed query, joined
  through `RolePermission`) — not cached in the token.

Net effect: revoking a _role_ from a user takes a re-login; revoking a
_permission_ from a role takes effect immediately for everyone who has
that role. That split matches which operation is actually common (tuning
what a department can do) vs. rare (moving a person between departments).

## 4. Authorization API (replaces `src/lib/rbac.ts`)

```ts
// requirePermission replaces requireRole; same call-site shape
export async function requirePermission(key: string) {
  const session = await auth();
  if (!session?.user?.id)
    throw new Error("Forbidden: insufficient permissions");

  const allowed = await prisma.rolePermission.findFirst({
    where: {
      permission: { key },
      role: {
        slug: { in: session.user.roleSlugs },
        users: { some: { userId: session.user.id } },
      },
    },
  });

  if (!allowed) throw new Error("Forbidden: insufficient permissions");
  return session;
}

export async function hasPermission(
  userId: string,
  key: string,
): Promise<boolean> {
  // same query, boolean return — for UI conditionals
}
```

(Exact query shape will tighten once this is actually built — the point
here is the interface stays a single function call at each existing
call site, so migrating `actions.ts` from `requireRole(WRITE_ROLES)` to
`requirePermission("pages:create")` is a small, mechanical change.)

`src/types/next-auth.d.ts` changes from `role?: Role` (singular enum) to
`roleSlugs: string[]` on `session.user`.

## 5. Admin UI needed

New surface area, gated by the new `roles:manage`/`users:manage`
permissions themselves (so only someone with `roles:manage` can create a
role or hand out `roles:manage` to anyone else):

- `/admin/roles` — list roles (name, description, permission count, user
  count), create new role
- `/admin/roles/[id]` — edit name/description, checkbox grid of every
  `Permission` grouped by `group`, save. `isSystem` roles show the same
  UI but block deletion.
- `/admin/users` — list users with their current roles; assign/remove
  roles per user (doesn't exist as an admin page at all today — currently
  the only user-facing account is whoever's seeded)

## 6. Migration plan from the current enum-based system

Both systems described here — the one from
[SECURITY_REVIEW.md](SECURITY_REVIEW.md) #1/#2 and this one — do the
same job; this is a replacement, not an addition, so existing data and
behavior need to carry over cleanly:

1. Add the four new tables (migration, additive — doesn't touch `User`
   yet).
2. Seed three system roles matching what exists today, so nothing
   regresses on cutover:
   - **Admin** (`isSystem: true`) — every permission
   - **Editor** — `pages:create/edit`, `posts:create/edit`,
     `media:upload`
   - **Viewer** — no permissions (read-only by omission, matching
     today's behavior)
3. Backfill: for every existing `User`, create a `UserRole` row pointing
   at the seeded role matching their current enum `role` value.
4. Switch `src/lib/auth.ts`, `src/lib/rbac.ts`, and every call site
   (`actions.ts`, the admin UI conditionals) over to the new
   `requirePermission`/`hasPermission` API.
5. Drop `User.role` and the `Role` enum in a final migration, once step 4
   is verified working end-to-end (same verification approach as before:
   log in as each seeded role, confirm expected access, via a real HTTP
   request, not just reading the code).

## 7. Interaction with the Collections system

[COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md)'s `CollectionConfig.access`
field currently reads:

```ts
access?: {
  read?: "public" | Role[];
  create?: Role[];
  ...
}
```

`Role[]` there meant the fixed TS enum. Once this plan lands, that
should become permission-key strings instead (`create?: string[]` — e.g.
`["pages:create"]`), consistent with §4 above, and each registered
collection auto-generates its own `collection:<slug>:*` permission keys
rather than referencing hardcoded roles directly. Worth updating that doc
once this one is agreed on, so the two don't drift into two different
access-control idioms.

## 8. Phased build order

1. This data model (migration + seed matching current behavior) —
   verify nothing regresses before changing any authorization code.
2. `requirePermission`/`hasPermission`, ported call sites in
   `actions.ts` and the admin Pages UI (mechanical, same shape as today).
3. `/admin/roles` — view and edit permission bundles for existing seeded
   roles first (no _creation_ yet — lower risk, proves the query shape
   works).
4. `/admin/users` + role assignment UI.
5. Role _creation_ from the admin UI (the actual "make a Marketing
   department" moment) — last, once editing/assignment are proven solid.
6. Drop the old enum column (§6 step 5).

## Open questions

- Should a role's permissions ever be scoped to _specific_ content
  (e.g. "Marketing can edit page X but not page Y"), or is
  resource-_type_-level enough for now (Marketing can edit any page)?
  This plan assumes type-level only — per-item scoping is a much bigger
  feature (closer to a full ACL system) and nothing today suggests it's
  needed yet.
- Should there be a hard floor preventing the last `roles:manage` holder
  from removing their own access (lockout protection)? Worth deciding
  before `/admin/roles` ships, not after someone locks themselves out.
