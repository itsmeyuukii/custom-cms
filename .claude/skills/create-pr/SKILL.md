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

6. **Open the PR** with `gh pr create`. Write a real title and body
   (Summary + Test plan sections, matching this project's established
   PR style) — don't leave it to `gh`'s auto-fill unless the change is
   genuinely trivial.

   ```bash
   gh pr create --title "<short title>" --body "$(cat <<'EOF'
   ## Summary
   - <what changed and why, 1-3 bullets>

   ## Test plan
   - [ ] <how this was/should be verified>
   EOF
   )"
   ```

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
