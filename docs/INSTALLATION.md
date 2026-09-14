# Installation Log — how this project was set up

Every command actually run to get this project from an empty folder to a
working app, in order. Use this to reproduce the setup elsewhere, or to
understand why a given package/config exists. See [PROJECT_PLAN.md](PROJECT_PLAN.md)
for what the result is, this file is about *how we got there*.

Prerequisites used: Node.js 24, npm 11, Windows with PowerShell, a Git repo
already created on GitHub to push to.

---

## 1. Git init + link to GitHub

```bash
git init
git remote add origin https://github.com/<you>/<repo>.git
```

## 2. Scaffold the Next.js app

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes
```

What each flag means: TypeScript, Tailwind CSS, ESLint, App Router, code
under `src/`, `@/*` import alias instead of relative paths, npm as the
package manager, Turbopack disabled for the dev/build scripts, `--yes` to
skip the interactive prompts.

> **Gotcha:** `create-next-app` refuses to scaffold directly into a folder
> whose name has capital letters or spaces (npm naming rules), since it
> uses the folder name as the default package name. If your folder name
> isn't a valid npm package name, scaffold into a temp subfolder instead
> (`npx create-next-app@latest custom-cms-tmp ...`), then move everything
> up a level and delete the temp folder. Afterwards fix `"name"` in
> `package.json` to something valid (we used `"custom-cms"`).

## 3. Install Prisma (database ORM)

```bash
npm install prisma @prisma/client --save
```

> **Gotcha:** npm's `latest` tag for `prisma` pointed at an `8.0.0-rc`
> (release candidate), not a stable version. Check `npm view prisma
> dist-tags` before trusting `latest` on a fast-moving package. We pinned
> to the last stable release instead:

```bash
npm install prisma@7.10.0 @prisma/client@7.10.0 --save-exact
```

> **Gotcha:** Prisma 7 removed the `url = env("DATABASE_URL")` line from
> `schema.prisma` entirely. It now requires a "driver adapter" and a
> `prisma.config.ts` file. For Postgres:

```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

`dotenv` is needed so `prisma.config.ts` (which runs outside Next.js, via
the Prisma CLI directly) can read `.env`:

```bash
npm install dotenv
```

(In our case `dotenv` was already pulled in as a transitive dependency of
another package, so this command reported "up to date" — install it
explicitly anyway so it's a direct dependency, not an implicit one.)

## 4. Install NextAuth (authentication)

```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

`next-auth@beta` because NextAuth v5 (the version compatible with the App
Router and what we used for Credentials-provider login) was still in beta
at time of writing. `@auth/prisma-adapter` lets NextAuth persist
users/sessions through Prisma. `bcryptjs` hashes passwords.

> **Gotcha:** don't run multiple `npm install` commands at the same time
> in the same project. We backgrounded two installs concurrently once and
> they raced writing `package.json`/`package-lock.json`, corrupting the
> in-progress install. Run them one after another.

## 5. Install tsx (run TypeScript scripts directly)

```bash
npm install -D tsx
```

Used to run `prisma/seed.ts` via `npm run db:seed` without a separate
compile step.

## 6. Generate the Prisma client and set up prisma.config.ts

Requires `prisma.config.ts` (see the actual file in this repo) and a
`.env` with a real `DATABASE_URL` to exist first — `prisma generate` reads
the config file, which reads `.env`, even though `generate` itself doesn't
touch the database.

```bash
npx prisma generate
```

## 7. Get a real Postgres database connected

We used a Postgres instance that was already installed locally on the
machine (Windows service `postgresql-x64-16`) but its password wasn't
known. If you're in the same situation: reset the password by briefly
setting `pg_hba.conf` auth to `trust`, restarting the Postgres Windows
service (requires an elevated/Administrator terminal), setting a new
password with `psql`, then restoring the original auth config and
restarting again. If you're starting fresh, it's simpler to just install
Postgres yourself (you'll know the password) or use a free hosted instance
(Neon, Supabase, Railway) and skip all of this.

Once you have a working connection string, put it in `.env`
(`DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"`)
and generate a random `AUTH_SECRET`:

```powershell
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

## 8. Run the migration and seed the database

```bash
npx prisma migrate dev --name init
npm run db:seed
```

The first command creates every table from `prisma/schema.prisma` and
writes the migration SQL to `prisma/migrations/` (committed to git). The
second runs `prisma/seed.ts`, which creates a starter admin login and
registers the example page components.

## 9. Run it

```bash
npm run dev
```

Then: `/login` to sign in (seeded admin: `admin@example.com` /
`changeme123`), `/admin` for the dashboard.

---

## Full dependency list this produced

**Runtime (`dependencies`):**
`next`, `react`, `react-dom`, `prisma`, `@prisma/client`,
`@prisma/adapter-pg`, `pg`, `dotenv`, `next-auth`, `@auth/prisma-adapter`,
`bcryptjs`

**Dev-only (`devDependencies`):**
`typescript`, `@types/node`, `@types/react`, `@types/react-dom`,
`@types/pg`, `@types/bcryptjs`, `tailwindcss`, `@tailwindcss/postcss`,
`eslint`, `eslint-config-next`, `tsx`

To install everything in one shot instead of following the steps above:

```bash
npm install next react react-dom prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-pg pg dotenv next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D typescript @types/node @types/react @types/react-dom @types/pg @types/bcryptjs tailwindcss @tailwindcss/postcss eslint eslint-config-next tsx
```

(Still start from `create-next-app` though, step 2, rather than this list
alone — it also generates `tsconfig.json`, `eslint.config.mjs`, Tailwind's
`postcss.config.mjs`, and the initial `src/app` structure that everything
else builds on.)
