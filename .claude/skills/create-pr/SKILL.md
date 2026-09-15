---
name: create-pr
description: Create a branch, commit staged/pending work, push it, and open a GitHub PR - the standard way to land any change in this repo, since direct pushes to main are not allowed here (see CLAUDE.md's Git conventions).
---

# Create PR

Use this whenever work in this repo is ready to be committed — never
`git commit` directly on `main` and never `git push origin main`. This
project requires every change to land through a branch + pull request
(see `CLAUDE.md`'s Git conventions section for why: it's what makes the
CI check in `.github/workflows/ci.yml` actually gate anything).

## Steps

1. **Check current branch.** If already on a feature branch (not
   `main`), continue using it. If on `main`, create a new branch first
   — never commit on `main` directly.

   Branch naming matches this repo's commit prefixes:
   `feat/short-description`, `fix/short-description`,
   `docs/short-description`, `chore/short-description`. Keep the
   description short and kebab-case.

   ```bash
   git checkout -b feat/short-description
   ```

2. **Run the pre-commit checks** (per `CLAUDE.md` — don't skip this):

   ```bash
   npm run format:check
   npm run lint
   npm run typecheck
   ```

   If `format:check` fails, run `npm run format` to fix it, then
   re-check. Fix any real lint/type errors before proceeding — don't
   commit broken code hoping CI catches it later.

3. **Review what's changing** before staging — `git status` and
   `git diff` (or `git diff --staged` if already staged). Never blindly
   `git add -A`; check for anything that shouldn't be committed
   (secrets, accidental debug files, temporary test scripts — see
   CLAUDE.md's Verification standard section on cleaning those up).

4. **Commit** with a conventional message (`feat:`, `fix:`, `docs:`,
   `chore:` prefix, explaining _why_ not just _what_ — match the style
   of this repo's existing commit history, `git log --oneline` for
   examples).

5. **Push the branch:**

   ```bash
   git push -u origin <branch-name>
   ```

6. **Open the PR** with `gh pr create`. Write a real title and body —
   don't leave it to `gh`'s auto-fill. Use this exact shape:

   ```bash
   gh pr create --title "<short title>" --body "$(cat <<'EOF'
   ## Summary
   - <what changed and why, 1-3 bullets>

   ## Scope
   **<no-op|low|medium|high>** — <one line: why this rating>

   ## Test plan
   - [x] <a specific check actually performed, or [ ] if still needed>
   - [x] <another one — be concrete: what command, what real data, what result>
   EOF
   )"
   ```

   **Scope** — rate the change itself, not the diff size. A 200-line
   docs change is `no-op`; a 3-line change to `src/lib/rbac.ts` is
   `high`. Pick the _highest_ tier that applies if a PR mixes concerns
   (which is itself a reason to prefer smaller, single-concern PRs):

   - **no-op** — no runtime behavior changes at all: docs, comments,
     `.claude/`/CI config that doesn't affect what ships, formatting-only.
   - **low** — small, isolated, follows an already-established pattern.
     A new route/page/component that mirrors an existing one, a copy
     change, a dependency patch-version bump, a new non-required field.
   - **medium** — touches shared or structural code, but in a
     contained, well-understood way: a new Prisma model + migration
     that only adds (never alters/drops), a new admin CRUD flow, a
     refactor confined to one module, CI/build script changes.
   - **high** — touches auth/authorization (`rbac.ts`, `auth.ts`,
     `proxy.ts`), any migration that alters or drops existing
     columns/tables, anything security-sensitive
     (`SECURITY_REVIEW.md`-adjacent), or changes to the production
     build/deploy path. Also: anything `create-plan` should have run
     for first — if this PR represents a "big enough" change per that
     skill's criteria and no design doc exists yet, that's a signal to
     go run `create-plan` before this PR, not just to label it `high`
     and proceed.

   **Test plan** — every line must name a _specific, real_ check, per
   `CLAUDE.md`'s Verification standard: an actual command run, real
   (temporary) data exercised, an actual response observed — not
   "should work" or a generic "tested locally." For anything touching
   the database or auth, type-checking passing is not sufficient
   evidence on its own; say what was actually queried/logged
   in/hit and what came back. If something genuinely wasn't verified
   yet, say so plainly with an unchecked `[ ]` rather than implying it
   was.

7. **Report the PR URL back** — `gh pr create` prints it; surface it
   clearly rather than leaving it buried in tool output.

## What this skill does NOT do

- Does not merge the PR — that's a separate, deliberate step (via
  `gh pr merge` or the GitHub UI), not part of landing a change.
- Does not push to `main` under any circumstance, even if asked to "just
  push it quick" — if that's genuinely needed, it's an explicit
  exception to raise with the user, not something to do silently.
- Does not skip the pre-commit checks in step 2, even for
  docs-only changes — `format:check` in particular catches markdown
  formatting issues cheaply.
