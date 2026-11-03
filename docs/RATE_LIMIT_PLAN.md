# Rate Limiting — Design Plan

Goal: cap how fast one client can hit login (brute-force protection,
[SECURITY_REVIEW.md](SECURITY_REVIEW.md) finding #4) and the public REST
API (`/api/v1/*`), using a counter shared by every serverless instance.

**Status: phases 1 (model + `src/lib/rate-limit.ts`), 2 (login
limiting) and 3 (public API limiting) done. Phase 4 (production check)
not started.** See §6.

Phase 3 was verified by the functional e2e suite against a local
production build (18 passed, 1 skipped): the new API test sees
`X-RateLimit-Limit: 120` / `Remaining: 119` and no `Set-Cookie` on the
first response, 119 more concurrent requests all `200`, then a `429`
with the `RATE_LIMITED` envelope, `Retry-After` within 1-60s and
`Remaining: 0`, while a different IP still gets `200`. The existing
"logged-out visitors are redirected from /admin/\*" test still passes,
so the `/admin` gate is unchanged behind the new proxy branch. One
implementation detail the design didn't anticipate: next-auth types the
wrapped proxy's second argument as route-handler context (`{ params }`),
not `NextFetchEvent`. It only forwards it to the callback, which ignores
it, so `proxy.ts` passes an empty context instead of a cast.

Phase 2 was verified by the full functional e2e suite against a local
production build: 17 passed (1 skipped, the Blob round trip), including
the two new `rate-limit.spec.ts` login tests. Afterwards every
`RateLimit` key in the test database was one of the tests' fake
`2001:db8:` IPs, none `unknown` or localhost, which confirms the
`x-forwarded-for` header reaches `authorize()` through `next start` and
Auth.js. The `CredentialsSignin` `code` passthrough (§3) works on this
Auth.js beta: `signIn()` returns `code: "rate_limited"`, and the login
page shows the distinct message.

Phase 1 was verified against the real local database with a throwaway
script (deleted after): 50 concurrent `consume` calls on one key with
limit 10 left exactly one row with `count = 50`, exactly 10 results
`allowed`, and each `remaining` value 0-9 exactly once. The stored
`windowStart` matched the UTC window boundary on a non-UTC machine,
windows rolled over correctly, `pruneExpired` removed a two-day-old row
and kept the current one, and `clientIp` handled `x-forwarded-for`,
`x-real-ip` and neither.

## The constraint everything rests on: no shared memory

Production runs on Vercel serverless functions. Each instance has its
own memory and may be cold-started or discarded at any time, so an
in-memory counter (the "small in-memory limiter" SECURITY_REVIEW #4
mentions) only sees the requests that landed on that one instance. An
attacker's attempts spread across instances never add up. The counter
has to live somewhere every instance can see.

**Decided: a Postgres table in the existing database.** Considered and
rejected:

- **Upstash Redis** (`@upstash/ratelimit`): built for exactly this and
  faster, but adds a new external service, account and env vars, and CI
  would need a token or a mock (the same gap Vercel Blob already
  leaves in the e2e suite).
- **Vercel Firewall rules**: no app code, but the rules live in the
  dashboard, not the repo (unreviewable in a PR, untestable in CI), and
  can only key on IP/path, not on the email being attacked.

Postgres needs nothing new, works identically locally, in CI's service
container and in production, and at this project's traffic one extra
indexed write per limited request is negligible. If traffic ever makes
that write matter, `src/lib/rate-limit.ts` (§2) is the only file that
changes to move to Redis.

## How this relates to what already exists

- **Login**: the limiter runs inside the Credentials provider's
  `authorize()` in `src/lib/auth.ts`, before the user lookup and
  `bcrypt.compare`, so a blocked attempt also skips the expensive hash.
  `src/app/login/page.tsx` gets one new error message.
- **Public API**: the limiter runs in `src/proxy.ts`, which today only
  gates `/admin/*`. API requests are limited _before_ (and bypass) the
  `auth()` wrapper; see §4 for why.
- **Admin Server Actions**: not limited. They already require a logged
  in session holding the right permission; limiting them is a separate
  concern with no current threat behind it.
- **e2e suite**: needs a small fixtures change (§5), since the whole
  suite logs in about 40 times per run from one IP.
- **SECURITY_REVIEW #5** (guessable seeded password) is what makes #4
  realistic; this plan closes #4 only.

## 1. Data model

```prisma
// One fixed-window counter per limited key, e.g.
// key = "login:ip:203.0.113.7", windowStart = 2026-11-03T10:15:00Z.
model RateLimit {
  key         String
  windowStart DateTime
  count       Int      @default(1)

  @@id([key, windowStart])
  @@index([windowStart])
}
```

Fixed windows (not sliding): one row per key per window, one atomic
statement per check. The known weakness, up to 2x the limit across a
window boundary, doesn't matter at these numbers.

Migration is purely additive (a new table), so it's safe under the
automatic `prisma migrate deploy` on Vercel.

## 2. `src/lib/rate-limit.ts`

```ts
export type RateLimitRule = {
  name: string; // key prefix, e.g. "login:ip"
  limit: number; // max requests per window
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date; // end of the current window
};

/** Counts one request against `rule` for `identifier` and reports
 * whether it's within the limit. */
export async function consume(
  rule: RateLimitRule,
  identifier: string,
): Promise<RateLimitResult>;

/** Client IP from the request headers (see "Client IP" below). */
export function clientIp(headers: Headers): string;
```

`consume` is a single raw statement, so concurrent requests can't
race between a read and a write:

```sql
INSERT INTO "RateLimit" ("key", "windowStart", "count")
VALUES ($1, $2, 1)
ON CONFLICT ("key", "windowStart")
DO UPDATE SET "count" = "RateLimit"."count" + 1
RETURNING "count";
```

(`prisma.rateLimit.upsert` with `increment` isn't used: whether Prisma
emits a native `ON CONFLICT` depends on the query shape, and a
read-then-write fallback would let parallel attempts slip through.)

**Cleanup:** rows are only useful for one window. About 1 in 100
`consume` calls also deletes rows with `windowStart` older than a day.
That needs no cron job, and the table stays at roughly one day of keys.

**Client IP:** first entry of `x-forwarded-for`, falling back to
`x-real-ip`, then `"unknown"`. On Vercel this header is set by the
platform, so a client can't spoof it. Phase 4 verifies that against
production rather than assuming it. Off Vercel (local `next start`,
CI) it's whatever the client sends. That's acceptable because nothing
off Vercel is publicly exposed, and the e2e suite relies on it (§5).

**Failure mode:** if the limiter's query throws, the API path _fails
open_ (logs and serves the request), since the API is read-only, public
data. Login doesn't need a special case: if the database is down, login
fails anyway.

## 3. Login limits

Checked in `authorize()`, in this order, both before touching `User`:

| Rule             | Key                   | Limit | Window |
| ---------------- | --------------------- | ----- | ------ |
| `login:ip-email` | IP + lowercased email | 5     | 15 min |
| `login:ip`       | IP                    | 30    | 15 min |

- `ip-email` is the brute-force stop: five guesses at one account from
  one place.
- `ip` stops one client from spraying many accounts.
- **No limit keyed on email alone.** It would stop a botnet guessing
  one account from many IPs, but it also lets anyone lock the real
  admin out by spamming failed logins for `admin@...`. With no lockout
  recovery flow, that trade isn't worth it yet (see Open questions).
- Every attempt counts, successful or not. Counting only failures would
  need a second write after `bcrypt.compare`; at 5 per 15 minutes a
  real user never notices the difference.

A blocked attempt throws a `CredentialsSignin` subclass so the client
can tell it apart from a wrong password:

```ts
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}
```

`signIn("credentials", { redirect: false })` then resolves with
`code: "rate_limited"`, and the login page shows "Too many sign-in
attempts. Try again in a few minutes." instead of "Invalid email or
password." (Phase 2 confirms this `code` passthrough on this Auth.js
beta before relying on it.)

## 4. Public API limits

| Rule     | Key | Limit | Window |
| -------- | --- | ----- | ------ |
| `api:ip` | IP  | 120   | 1 min  |

Applied in `src/proxy.ts`, with the matcher extended to
`/api/v1/:path*`, so every current and future v1 route is covered
without each handler remembering to call it.

API requests branch off **before** the `auth()` wrapper. That wrapper
can write session cookies onto responses (the root of the open sign-out
bug in PROJECT_PLAN §4), and a public API response has no reason to
touch them:

```ts
const adminProxy = auth((req) => { /* existing /admin gate */ });

export default async function proxy(req: NextRequest, ctx: ...) {
  if (req.nextUrl.pathname.startsWith("/api/v1/")) return limitApi(req);
  return adminProxy(req, ctx);
}
```

Over the limit, the response is the standard envelope via `apiError`:
`429`, `{ error: { code: "RATE_LIMITED", message } }`, plus a
`Retry-After` header (seconds to `resetAt`). Allowed responses carry
`X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`
so API consumers (e.g. `apps/my-portfolio`) can pace themselves.

`apps/my-portfolio` fetches from the CMS server-side. At build/ISR time
all of its requests come from Vercel's IPs and could share one bucket.
At its current size (a handful of requests per render) that's far under
120/min, but if it ever trips, the fix is a higher limit for a
server-to-server key, not removing the limit (Open questions).

## 5. Testing

**e2e:** every login in the suite shares one IP, about 40 per run, more
with retries and back-to-back local runs, which would trip `login:ip`.
So `e2e/fixtures.ts`'s `login()` gives each test its own
`x-forwarded-for` (a random TEST-NET address via
`page.setExtraHTTPHeaders`), giving every test fresh buckets. This
works because off Vercel the header is trusted (§2).

New `e2e/rate-limit.spec.ts`:

- Five wrong-password attempts for one email from one fake IP show
  "Invalid email or password."; the sixth shows the rate-limit message,
  even with the _correct_ password.
- The same email from a different fake IP can still log in (the limit
  is per IP + email, not an account lockout).
- 121 requests to `/api/v1/pages` from one fake IP: the 121st is a
  `429` with the `RATE_LIMITED` envelope and a `Retry-After` header.
  Another IP still gets `200`.

The visual login screenshots don't change. The new message only
appears on a path they don't take.

**Verification standard (CLAUDE.md):** a throwaway script fires 50
concurrent `consume` calls at one key against the real local database
and checks the final count is exactly 50 (the atomicity claim in §2).
Then delete the script and its rows.

## 6. Phased build order

1. **Model + `src/lib/rate-limit.ts`**: migration, `consume`,
   `clientIp`, opportunistic cleanup. Verified with the concurrency
   script above. No behavior change yet.
2. **Login limiting**: `authorize()` checks, `RateLimitedSignin`, the
   login page message, the fixtures change, and the login half of
   `rate-limit.spec.ts`.
3. **API limiting**: proxy branch, `429` envelope and headers, the API
   half of `rate-limit.spec.ts`.
4. **Production check**: after deploy, against the live site, using a
   nonexistent email (so no real account is touched): make 6 bad login
   attempts, each with a _different_ spoofed `x-forwarded-for`. If the
   6th is still rate-limited, Vercel ignored the spoofed header and the
   real IP was used. Then mark SECURITY_REVIEW #4 fixed.

## Open questions

- **Distributed attacks on one account** (many IPs, one email) aren't
  stopped by these rules. The usual answer is a per-email limit plus a
  recovery path (email unlock, CAPTCHA after N failures), which this
  project doesn't have. Revisit along with SECURITY_REVIEW #5.
- **Server-to-server API consumers** (`apps/my-portfolio` at
  build/ISR time) share Vercel egress IPs. Not an issue at today's
  volume. If it becomes one: an API key with its own higher limit.
- **Exact numbers** (5/30 per 15 min, 120/min) are reasonable defaults,
  not measured. They live as constants in one place and are cheap to
  tune.
- **Moving to Redis** if the extra database write ever shows up in
  latency. `consume`'s signature is meant to survive that swap
  unchanged.
