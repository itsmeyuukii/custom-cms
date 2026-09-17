# Admin UI Theme — Design Plan

Goal: give the admin UI (currently hand-rolled, unstyled-ish Tailwind
markup repeated per page) a real shared component library and visual
theme, styled after Catalyst (Tailwind Plus) — without redistributing
Catalyst's licensed source.

**Status: design only, nothing in this doc is implemented yet.**

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for how this fits the rest of
the roadmap, and [COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md) for the
system this theme needs to be ready for.

## Why "styled after," not "built from," Catalyst

`itsmeyuukii/custom-cms` is a **public** GitHub repo. Catalyst is
licensed under the Tailwind Plus license, which covers _using_ the kit
to build a product — not committing its source files into a public
repo's git history, which is redistribution. The owner has a valid
Tailwind Plus license and has no interest in reselling it; the
constraint is purely "don't publish their source code," not "don't
achieve a similar look."

So the rule for implementation: build our own original component
files from scratch in this repo. It's fine (encouraged, even) to match
Catalyst's visual result closely — palette, spacing, radii, focus
states, the sidebar-layout/navbar shape, table density, dialog style —
since a look-and-feel and standard UI patterns (buttons, sidebars,
tables) aren't what the license restricts. What's not fine is opening
a Catalyst file and transcribing or lightly-editing its code. Nobody
should read Catalyst source while writing a component in this repo;
work from the rendered look (screenshots/the live demo) or from memory
of common Tailwind/Headless UI patterns instead.

Practical implication: no files from
`C:\Users\User\Downloads\catalyst-ui-kit` get copied into this repo,
ever, in any form (not vendored, not git-ignored-but-referenced). This
repo's `src/components/ui/` will end up looking similar to Catalyst by
design, but every line in it is original.

## How this relates to what already exists

- Replaces the ad-hoc inline Tailwind classes duplicated across
  `src/app/admin/**/page.tsx`, `src/app/admin/layout.tsx`, and
  `src/app/login/page.tsx` with a shared set of components.
- Sits alongside `src/components/blocks/` (untouched) as a new sibling,
  `src/components/ui/` — blocks compose _public page content_; `ui/`
  components are _admin chrome and form controls_. No overlap, no
  registry needed (`ui/` components are imported directly, not looked
  up by key like blocks are).
- **Out of scope:** the public-facing site (`src/app/[slug]/page.tsx`,
  `BlockRenderer`, block components themselves). This theme only
  touches `/admin` and `/login`.
- Directly enables [COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md) Phase 5
  (the generic `/admin/[collection]` list/edit UI) — that UI should be
  built using this component library from day one rather than more
  hand-rolled markup that would need migrating later.

## 1. Component inventory & file layout

New folder: `src/components/ui/`, one file per component (matching the
flat style already used in `src/components/blocks/`):

```
src/components/ui/
  button.tsx          # primary/secondary/danger variants
  input.tsx
  textarea.tsx
  select.tsx
  checkbox.tsx
  fieldset.tsx         # Field, FieldGroup, Label, ErrorMessage
  text.tsx             # body text / muted text primitives
  link.tsx             # wraps next/link with themed styles
  badge.tsx            # status pills (DRAFT/PUBLISHED/ARCHIVED, roles)
  table.tsx            # Table, TableHead, TableRow, TableCell
  dialog.tsx           # confirm/edit modals (role assign, delete confirm)
  dropdown.tsx         # user menu, row action menus
  avatar.tsx           # user initials/avatar in navbar
  navbar.tsx
  sidebar.tsx
  sidebar-layout.tsx   # the /admin shell
  auth-layout.tsx      # the /login shell
```

Each is a normal Server Component where possible; only ones needing
interactivity (`dialog`, `dropdown`, `select`, the mobile sidebar
toggle) are `"use client"`, consistent with this repo's existing
Server-Component-by-default rule.

## 2. Design tokens

Concrete starting values (adjust freely during implementation — these
aren't sacred, just a starting point so phase 1 has something to build
against):

- Palette: Tailwind's built-in `zinc` for neutrals, `indigo` for
  primary actions/focus rings, `red` for destructive actions —
  standard Tailwind palette, no custom colors needed.
- Radius: `rounded-lg` on inputs/buttons/cards, `rounded-md` on
  smaller controls (badges, dropdown items).
- Focus state: `focus:outline-none focus:ring-2 focus:ring-indigo-500
focus:ring-offset-2` consistently across all interactive components.
- Font: keep the existing default (no custom font import) — the
  current admin has no typographic identity worth preserving or
  replacing.
- Dark mode: not included in phase 1 (see Open Questions).

## 3. Dependencies

```
npm install @headlessui/react clsx
```

`framer-motion` is deliberately **not** included — Headless UI ships
its own `<Transition>` primitives, which cover dialog/dropdown
open-close animation without adding a second animation library. Revisit
only if a specific interaction genuinely needs spring physics Headless
UI's transitions can't do.

## 4. Admin shell restructure

`src/app/admin/layout.tsx` currently hand-builds a fixed `<aside>` +
`<nav>` with plain `<Link>`s and no mobile behavior. It becomes:

```tsx
// src/app/admin/layout.tsx
import { SidebarLayout } from "@/components/ui/sidebar-layout";
import { Sidebar, SidebarItem, SidebarSection } from "@/components/ui/sidebar";
import { Navbar } from "@/components/ui/navbar";
// ...auth()/hasPermission() calls unchanged...

return (
  <SidebarLayout
    navbar={<Navbar user={session?.user} />}
    sidebar={
      <Sidebar>
        <SidebarSection>
          <SidebarItem href="/admin">Dashboard</SidebarItem>
          <SidebarItem href="/admin/pages">Pages</SidebarItem>
          <SidebarItem href="/admin/posts">Posts</SidebarItem>
          <SidebarItem href="/admin/media">Media</SidebarItem>
          {canManageRoles && (
            <SidebarItem href="/admin/roles">Roles</SidebarItem>
          )}
          {canManageUsers && (
            <SidebarItem href="/admin/users">Users</SidebarItem>
          )}
        </SidebarSection>
      </Sidebar>
    }
  >
    {children}
  </SidebarLayout>
);
```

All existing `auth()` / `hasPermission()` gating logic is preserved
exactly — this phase is a pure presentation swap, no authorization
changes.

## 5. Phased build order

Each phase is its own branch + PR per this repo's git conventions —
no big-bang rewrite in one commit.

1. **Foundation primitives** — `button`, `input`, `textarea`,
   `fieldset`, `text`, `link`, `badge`. No page changes yet; just the
   building blocks landing in `src/components/ui/`.
2. **Login page** — self-contained, single file, highest visual
   visibility, good first real usage of the primitives.
3. **Admin shell** — `sidebar`, `sidebar-layout`, `navbar`, `dropdown`,
   `avatar`; replace `src/app/admin/layout.tsx` per §4. Every admin
   page immediately looks themed even before its own content is
   migrated, since they all render inside this shell.
4. **Roles & Users pages** — smallest, most form/table-heavy pages;
   introduces `table` and `dialog` (role assignment, add-role forms).
5. **Media page** — grid/list of uploads plus the delete action
   (`docs/PROJECT_PLAN.md` P2 item still open) — good pairing since
   that UI is being touched anyway.
6. **Pages admin** — the page/block editor UI; highest complexity,
   done last once the primitive set has proven itself elsewhere.
7. **Posts** — minimal-touch only (swap in `table`/`button`). Posts is
   slated to become the first real Collection
   ([COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md)), so it's not worth
   deep investment in its current hand-rolled form.
8. **Collections admin UI** — not a migration, a first build: when
   COLLECTIONS_PLAN.md Phase 5 (`/admin/[collection]`) starts, it's
   built directly on `src/components/ui/` from the start.

## Open questions

- **Dark mode**: build light-only for now, or both from phase 1? Light
  can ship first with tokens still allowing dark to be layered in
  later, but every component would need a dark variant sooner or
  later. Not decided; can be revisited per-phase rather than blocking
  phase 1.
- **Icons**: Catalyst's real docs pair it with Heroicons
  (`@heroicons/react`, also free/MIT, unrelated to the Tailwind Plus
  license). Not listed as a dependency above — add it in phase 1 if
  the sidebar/navbar need icons, since it's a separate, unrestricted
  package.
- **Table pagination component**: only needed once a list page has
  enough rows to paginate (likely first hit by Collections, not
  current admin pages). Defer building `pagination.tsx` until Phase 5
  actually needs it.
