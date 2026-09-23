# Portfolio Theme — Component Breakdown Plan

Goal: bring the "Charcoal & Ember" portfolio theme
(`C:\Users\User\Downloads\portfolio-theme\portfolio-theme`, a standalone
React + Tailwind v4 theme) into `apps/my-portfolio` as real, placeholder
UI — replacing the current JSON-dump home page with an actual designed
site, wired to static placeholder data. Hooking that data up to the
CMS's real REST API is explicitly **out of scope** here and gets its own
plan once this lands.

**Status: design only, nothing implemented yet.**

See [PROJECT_PLAN.md](PROJECT_PLAN.md) §5 item 10 and
[MONOREPO_PLAN.md](MONOREPO_PLAN.md)'s "First site" section, which
already flags this exact gap: _"no real visual design, no
`BlockRenderer` equivalent... building a real per-component renderer
here is the next step once there's actual portfolio content/design to
build toward."_ This plan is that next step, split into two: this doc
(the component breakdown + placeholder wiring) and a follow-up plan
(CMS wiring — replacing the placeholder data with real fetched content).

## Why placeholder first, CMS wiring later

`apps/my-portfolio` currently has no real design to preserve — its home
page (`src/app/page.tsx`) just fetches a page from the CMS and dumps
each block's `data` as raw JSON. There's nothing to reconcile the
theme's design against, so the fastest path to something real is:
land the theme as-is with its own static data file, confirm it looks
right and builds cleanly, _then_ separately design how its data shapes
(`Project`, `site`, `services`, ...) map onto the CMS's actual
`Page`/`Block`/`Component` model. Trying to do both at once would mean
guessing at a data-fetching design before the visual target even exists
in the codebase to build toward.

## How this relates to what already exists

- Replaces `apps/my-portfolio/src/app/page.tsx`'s current body (the
  `getPage("home")` call + JSON-dump fallback) with the theme's static
  composed page. `src/lib/cms.ts` (the REST API client) is **not**
  touched or deleted — it stays unused until the follow-up CMS-wiring
  plan reintroduces it here.
- Replaces `apps/my-portfolio/src/app/globals.css` wholesale with the
  theme's `styles.css` (Charcoal & Ember tokens). Nothing there is worth
  preserving — the current file is Next.js's unmodified starter
  template (Geist fonts, plain light/dark background/foreground vars).
- Replaces the Geist font setup in `apps/my-portfolio/src/app/layout.tsx`
  with the theme's fonts (Space Grotesk + DM Sans), loaded via
  `next/font/google` rather than the `<link>` tags the theme's own
  README suggests — `next/font` is already this repo's established
  pattern (see the existing Geist setup) and self-hosts/optimizes the
  fonts instead of a render-blocking Google Fonts request.
- New folder `apps/my-portfolio/src/components/portfolio/`, sibling to
  `src/lib/` — mirrors `apps/cms`'s `src/components/blocks/` naming
  convention (a components folder scoped to one concern) even though
  there's no registry/key-lookup here, since portfolio components are
  composed directly in `page.tsx`, not placed dynamically like CMS
  blocks are.

## 1. Component inventory

Copied close to verbatim from the theme (they're already clean,
typed, server-component-only, no client interactivity) into
`apps/my-portfolio/src/components/portfolio/`:

```
src/components/portfolio/
  SiteNav.tsx           sticky top nav — site name, anchor links, "Hire me"
  Hero.tsx               name/role/tagline, CTA buttons, stat row
  SectionHeading.tsx     shared eyebrow/title/description heading
  ProjectGrid.tsx        featured project panel + card grid ("#work")
  ProjectCard.tsx        single project card (image, tags, code/live links)
  Services.tsx           numbered service cards
  About.tsx               photo + bio split section ("#about")
  ContactCTA.tsx          closing call-to-action ("#contact")
  SiteFooter.tsx          copyright + social links
src/lib/portfolio-data.ts  site/projects/services/stats/about — all
                           placeholder content, typed (Project, etc.)
```

All nine are Server Components already (no `"use client"` anywhere in
the theme) — matches this repo's server-components-by-default
convention with zero changes needed. `@/*` resolves the same way in
both projects, so imports (`@/lib/portfolio-data`,
`./ComponentName`) carry over unchanged.

`apps/my-portfolio/src/app/page.tsx` becomes:

```tsx
import { SiteNav } from "@/components/portfolio/SiteNav";
import { Hero } from "@/components/portfolio/Hero";
import { ProjectGrid } from "@/components/portfolio/ProjectGrid";
import { Services } from "@/components/portfolio/Services";
import { About } from "@/components/portfolio/About";
import { ContactCTA } from "@/components/portfolio/ContactCTA";
import { SiteFooter } from "@/components/portfolio/SiteFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <Hero />
        <ProjectGrid />
        <Services />
        <About />
        <ContactCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
```

## 2. Styling integration

- `styles.css`'s three parts all move into
  `apps/my-portfolio/src/app/globals.css`, replacing it entirely:
  the `@theme inline` token mapping, the `:root` Charcoal & Ember
  palette (dark-first — no light-mode variant, matching the theme's own
  design), and the `@utility`/`@keyframes` blocks (`shadow-ember`,
  `bg-gradient-ember`, `rise-in`, `text-balance`).
- Needs `tw-animate-css` added to `apps/my-portfolio/package.json`
  (`rise-in`'s `@import` dependency) — not currently a dependency there.
- `html`/`body` in `layout.tsx` drop the Geist font variable classes in
  favor of the new `next/font/google` Space Grotesk + DM Sans variables,
  matching `--font-display`/`--font-sans` in the theme's `@theme` block.

## 3. Images: plain `<img>`, not `next/image`, for now

The theme ships plain `<img>` tags (`ProjectCard`, `ProjectGrid`,
`About`) pointing at hotlinked Unsplash URLs as stand-ins for real
project screenshots/portraits. Keeping `<img>` rather than switching to
`next/image`:

- `next/image` requires allowlisting every source domain in
  `next.config.ts` (`images.remotePatterns`) up front. The real image
  source post-CMS-wiring is unknown yet — could be Vercel Blob (like
  `apps/cms`'s media uploads, see `MEDIA_PLAN.md`) or something else —
  so configuring it now means configuring it twice.
- This is placeholder content by design; optimizing its delivery isn't
  worth doing before the real images (and their real host) are decided,
  which naturally happens in the CMS-wiring follow-up plan.

Revisit in that follow-up plan once the real image source is known.

## 4. Phased build order

Each phase its own branch + PR per this repo's git conventions.

1. **Styling foundation** — replace `globals.css`, add `tw-animate-css`,
   swap fonts in `layout.tsx`. Verify the (still-JSON-dump) home page
   renders with the new dark theme applied — confirms the token/font
   plumbing works before any component lands.
2. **Static + shared components** — `SectionHeading`, `SiteNav`,
   `SiteFooter`, plus `src/lib/portfolio-data.ts`. No page wiring yet.
3. **Hero + About + ContactCTA** — the simpler content sections.
4. **ProjectGrid + ProjectCard + Services** — the more complex,
   list-driven sections.
5. **Compose `page.tsx`** — assemble all components per §1, drop the
   `getPage`/JSON-dump body. Verify the full page in a browser: layout,
   responsive behavior (mobile width), hover/scroll states, and that
   `npm run build` succeeds (catches any lingering `next/image` domain
   or font-loading issue before it reaches Vercel).

## Open questions

- **Hotlinked Unsplash placeholder images** — fine short-term (this is
  a placeholder phase), but hotlinking third-party URLs from a public
  repo's committed source isn't something to ship to the real
  production domain indefinitely. Flag for the CMS-wiring plan to
  replace with real project images once there's real content.
- **`site`/`about` placeholder copy** (name, role, bio, social links)
  currently matches the theme author's own example content almost
  exactly — worth a pass to make it clearly placeholder-shaped (or
  swap in real content) before this is live on the production domain,
  separate from the CMS-wiring question.
- **Anchor-link nav** (`#work`, `#about`, `#contact`) assumes a
  single-page site. If the CMS-wiring plan introduces multiple routed
  pages, `SiteNav`'s links need to change from in-page anchors to real
  routes — not a concern for this placeholder phase, but worth flagging
  so it isn't a surprise later.
- **Shape of the future CMS-wiring plan**: confirmed direction (not yet
  designed) is a dedicated portfolio content model in the CMS —
  `projects`/`services`/etc. as [COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md)
  Collections, not shoehorned into the existing `Page`/`Block` model
  `getPage("home")` currently targets. That follow-up plan depends on
  Collections actually being built (`PROJECT_PLAN.md` §5 item 6, itself
  gated on RBAC v2's access-control integration, item 7) — so it's
  sequenced after Collections lands, not immediately after this one.
