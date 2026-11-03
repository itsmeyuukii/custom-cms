// Fixed-window rate limiting backed by Postgres (docs/RATE_LIMIT_PLAN.md).
// Serverless instances share no memory, so counters live in the
// RateLimit table where every instance sees the same count.

import { prisma } from "@/lib/prisma";

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

// Roughly 1 in 100 calls also prunes old windows, so no cron job is needed.
const PRUNE_PROBABILITY = 0.01;

/**
 * Counts one request against `rule` for `identifier` and reports whether
 * it's within the limit. One atomic statement, so concurrent requests
 * can't race between a read and a write.
 */
export async function consume(
  rule: RateLimitRule,
  identifier: string,
): Promise<RateLimitResult> {
  const windowMs = rule.windowSeconds * 1000;
  const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `${rule.name}:${identifier}`;

  // Window start is computed in SQL from epoch seconds, in UTC, so the
  // stored `timestamp` doesn't depend on the server's local time zone.
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${key}, to_timestamp(${windowStartMs / 1000}) AT TIME ZONE 'UTC', 1)
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"
  `;

  if (Math.random() < PRUNE_PROBABILITY) {
    await pruneExpired().catch((error) =>
      console.error("Rate-limit prune failed", error),
    );
  }

  const count = rows[0].count;
  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt: new Date(windowStartMs + windowMs),
  };
}

/** Deletes windows that started more than a day ago. */
export async function pruneExpired() {
  await prisma.$executeRaw`
    DELETE FROM "RateLimit"
    WHERE "windowStart" < (now() AT TIME ZONE 'UTC') - interval '1 day'
  `;
}

/**
 * Client IP for keying limits. On Vercel, `x-forwarded-for` is set by the
 * platform; off Vercel it's whatever the client sent, which the e2e suite
 * relies on to give each test its own IP (RATE_LIMIT_PLAN.md §2, §5).
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
