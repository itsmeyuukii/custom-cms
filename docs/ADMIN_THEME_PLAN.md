# Admin UI Theme — Design Plan

Goal: give the admin UI (currently hand-rolled, unstyled-ish Tailwind
markup repeated per page) a real shared component library and visual
theme, styled after Catalyst (Tailwind Plus) — without redistributing
Catalyst's licensed source.

**Status: phases 1-6 done (foundation primitives, login page, admin
shell, Roles & Users pages, Media page, Pages admin) — see §5. Phase 7
is superseded and phase 8 (Collections admin UI) is the only remaining
work.**

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

1. ~~**Foundation primitives**~~ — **done**: `button`, `input`,
   `textarea`, `fieldset`, `text`, `link`, `badge` landed in
   `src/components/ui/`.
2. ~~**Login page**~~ — **done**: `src/app/login/page.tsx` uses `Button`,
   `Input`, and the `fieldset` primitives.
3. ~~**Admin shell**~~ — **done**: `src/app/admin/layout.tsx` uses
   `SidebarLayout`/`Sidebar`/`SidebarItem`/`SidebarSection`/`Navbar` per
   §4; `dropdown`/`avatar` power the navbar's user menu.
4. ~~**Roles & Users pages**~~ — **done**: added the two components this
   phase actually needed —
   [table.tsx](../src/components/ui/table.tsx) (`Table`/`TableHead`/
   `TableBody`/`TableRow`/`TableHeader`/`TableCell`) and
   [checkbox.tsx](../src/components/ui/checkbox.tsx) (`Checkbox`/
   `CheckboxField`) — then migrated all 5 pages
   (`/admin/roles`, `/admin/roles/new`, `/admin/roles/[id]`,
   `/admin/users`, `/admin/users/[id]`) onto the full primitive set,
   including shifting the old ad-hoc `gray-*` Tailwind classes to the
   kit's `zinc`/`indigo` tokens (§2) for consistency. Skipped `dialog` —
   this phase's own interactions (role assignment, permission editing)
   are full-page forms, not modals, in the actual current pages; nothing
   here needed one. `Badge` (anticipated for "status pills... roles" in
   §1) turned out to fit naturally for a user's role list on
   `/admin/users`. Pure presentation swap as required — every
   `auth()`/`hasPermission()` check, redirect, and Server Action binding
   is untouched.

   Verified against the real database through the real rendered UI, not
   just `tsc`: ran the dev server, logged in as admin via real NextAuth
   credentials POSTs, fetched all 4 list/edit pages and confirmed the
   themed markup (button/table/badge/checkbox classes) rendered with the
   correct real data (roles, permission/user counts, per-user role
   badges, pre-checked permission/role checkboxes matching the database).
   Drove the real `updateRole` Server Action (extracting its actual
   `$ACTION_1:0`/`$ACTION_1:1` fields from the new form) to add
   `pages:publish` to Editor — permission count went 5→6 — then reverted
   it, confirming both the mutation and the revert actually took.
   Confirmed the viewer role still gets redirected away from
   `/admin/roles` and `/admin/users`, matching the pre-migration
   behavior exactly. Could not get a real browser screenshot in this
   environment (the built-in browser can't reach a `localhost` dev
   server, and the Claude-in-Chrome extension wasn't connected in this
   session) — verification here is real rendered HTML/HTTP behavior, not
   a visual check; worth an actual look in a browser before trusting the
   visual polish completely.

5. ~~**Media page**~~ — **done** (#32): grid/list of uploads plus the delete action
   (`docs/PROJECT_PLAN.md` P2 item still open) — good pairing since
   that UI is being touched anyway.
6. ~~**Pages admin**~~ — **done**: `/admin/pages`, `/admin/pages/new`, and
   `/admin/pages/[id]` migrated onto `Table`/`Badge`/`Button`/`ButtonLink`/
   `Input`/`Textarea`/`fieldset`, plus one new primitive,
   [select.tsx](../apps/cms/src/components/ui/select.tsx) (a styled native
   `<select>`, same `invalid` ring treatment as `Input`, for the "Add
   Block" component picker). Page status now renders as a `Badge`
   (DRAFT yellow, PUBLISHED green, ARCHIVED zinc) in both the list and
   the detail header. The block editor itself is unchanged (still raw
   JSON, per PROJECT_PLAN §4) — this phase is a pure presentation swap;
   every `auth()`/`hasPermission()` check and Server Action binding is
   untouched. Verified against the real database through the real UI:
   logged in as admin and viewer via real NextAuth credentials POSTs,
   confirmed the themed list/new/detail markup and that viewer sees no
   "New Page" link or write controls (and is redirected from
   `/admin/pages/new`); created a temporary page through the real
   `createPage` action, then drove the real bound `setPageStatus` and
   `addBlock` actions (extracted `$ACTION_n:0`/`:1` fields from the
   rendered forms) — status flipped to PUBLISHED, the public
   `/zz-theme-test` route returned 200, and the new block rendered.
   Temp page and blocks deleted afterward. As with phase 4, no real
   browser screenshot was possible here, so visual polish is unchecked.
7. **Posts** — superseded: Posts is now the Collections system's first
   real collection ([COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md) phase 6)
   and its admin UI is the generic `/admin/[collection]` route from
   phase 8 below, not a standalone Posts page anymore.
8. **Collections admin UI** — **shipped, but not on this kit**:
   `/admin/[collection]` ([COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md)
   phase 5) was built with plain hand-rolled Tailwind, not
   `src/components/ui/`, deviating from this phase's explicit plan ("not
   a migration, a first build... on `src/components/ui/` from the
   start"). Worth a follow-up pass to bring it onto the kit — same
   Roles/Users treatment (`Table`, `Button`, `Badge`, and a new
   `FieldInput`-aware use of `fieldset`/`Checkbox`/`select` primitives)
   — once prioritized.

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
