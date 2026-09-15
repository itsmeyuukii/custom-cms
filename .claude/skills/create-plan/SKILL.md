---
name: create-plan
description: Write a docs/<NAME>_PLAN.md design doc BEFORE implementing a substantial new feature or architectural change in this project. Proactively invoke this - without waiting for the user to type /create-plan - whenever a task is big enough to warrant one. Big enough means any of: a new data model or storage decision, a new cross-cutting system (a new auth model, a new content model, a new API paradigm), multiple genuine design tradeoffs with no obviously-correct answer, or something that would be expensive/hard to unwind if built the wrong way first. Skip it for a single new route/page/component following an already-established pattern in this codebase, a bug fix, a small UI tweak, or anything where the right approach is already obvious or precedented elsewhere in the repo.
---

# Create Plan

This project's actual practice (established building the Collections
system and RBAC v2 — see `docs/COLLECTIONS_PLAN.md` and
`docs/RBAC_PLAN.md`): for anything big enough, write the design down,
get it agreed, _then_ build — don't design-while-coding for substantial
architectural decisions.

**Assess before invoking anything else.** If the task in front of you
matches the "big enough" criteria in this skill's description, use this
skill first, even if the user didn't explicitly ask for a plan and
didn't type `/create-plan`. If it doesn't match (a small, mechanical,
or already-patterned change), skip this entirely and just build it —
don't manufacture a design doc for something that doesn't need one.

## Steps

1. **Name the doc.** `docs/<NAME>_PLAN.md`, matching the existing
   pattern (`COLLECTIONS_PLAN.md`, `RBAC_PLAN.md`) — short, uppercase,
   underscore-separated, ending in `_PLAN.md`.

2. **Identify the real forks first.** Before writing prose, find the
   1-3 decisions that actually matter and would be expensive to get
   wrong or reverse later (see `RBAC_PLAN.md`'s "core distinction"
   section and `COLLECTIONS_PLAN.md`'s "one big fork in the road" for
   what this looks like). If there's a genuine fork with no obviously
   correct answer, use `AskUserQuestion` to resolve it _before_ writing
   the doc, not after — the doc should reflect a decision already made,
   with the reasoning recorded, not present open forks as an
   afterthought. Reserve open, undecided questions for the doc's final
   "Open questions" section — things that are genuinely fine to leave
   unresolved until implementation starts.

3. **Write the doc, following this project's established shape:**

   - Title + one-line goal statement
   - `**Status: design only, nothing implemented yet.**` (or, if this
     supersedes an earlier simpler version already built — like RBAC v2
     superseding the RBAC v1 that shipped first — say so explicitly and
     link it)
   - A short framing/context section explaining the core distinction or
     constraint the rest of the doc rests on, if there is one
   - How this relates to what already exists in the codebase — what
     stays as-is, what this replaces, what depends on it
   - Numbered technical sections for each real component of the design
     (data model, config shape, API surface, etc.) — concrete enough to
     build from (real TS types / Prisma schema sketches / route lists),
     not just prose
   - A phased build order — small, independently-useful/testable
     phases, not "build the whole thing then test it"
   - An "Open questions" section for anything genuinely left unresolved

4. **Cross-link it** from `docs/PROJECT_PLAN.md`: add it to the "See
   also" line near the top, and add it to the roadmap (§5) in the
   right sequence position relative to other planned/in-progress work —
   note explicitly if it depends on or is depended on by another
   planned system (e.g. Collections' access config depending on RBAC
   v2).

5. **Stop and get agreement before implementing.** Present the plan,
   flag anything you're genuinely unsure about, and wait for the user
   to confirm direction — same as every design doc in this project's
   history. Don't proceed to write implementation code in the same
   turn the plan is first presented, even if confident it's right.

6. **Land it via the `create-pr` skill**, like any other change in this
   repo — a plan doc is still a real change that goes through branch +
   PR, not a special case that skips it.

## What this skill does NOT do

- Does not implement anything — it produces the design doc and stops.
- Does not replace judgment with process — a two-line config tweak
  doesn't need this treatment even if it's technically "a decision."
  When genuinely unsure whether something clears the bar, err toward
  asking the user directly rather than either skipping planning for
  something that needed it, or over-processing something trivial.
