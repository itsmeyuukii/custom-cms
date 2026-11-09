import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";
import { consume, pruneExpired, type RateLimitRule } from "./rate-limit";

// Unique per test file run, so cleanup only touches rows made here.
const prefix = `test:${randomUUID()}`;

function rule(limit: number, windowSeconds = 60): RateLimitRule {
  return { name: prefix, limit, windowSeconds };
}

afterEach(async () => {
  vi.useRealTimers();
  await prisma.rateLimit.deleteMany({
    where: { key: { startsWith: prefix } },
  });
});

describe("consume", () => {
  it("counts concurrent requests atomically", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () => consume(rule(10), "burst")),
    );

    const rows = await prisma.rateLimit.findMany({
      where: { key: `${prefix}:burst` },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(50);

    const allowed = results.filter((r) => r.allowed);
    expect(allowed).toHaveLength(10);
    expect(allowed.map((r) => r.remaining).sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(
      results.filter((r) => !r.allowed).every((r) => r.remaining === 0),
    ).toBe(true);
  });

  it("keys each identifier separately", async () => {
    await consume(rule(1), "a");
    const blocked = await consume(rule(1), "a");
    const other = await consume(rule(1), "b");

    expect(blocked.allowed).toBe(false);
    expect(other.allowed).toBe(true);
  });

  it("stores the UTC window start and starts a new window after it ends", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const windowStart = Date.UTC(2030, 0, 1, 12, 0, 0);
    vi.setSystemTime(windowStart + 30_000);

    const first = await consume(rule(2), "roll");
    await consume(rule(2), "roll");
    const third = await consume(rule(2), "roll");

    expect(first.resetAt).toEqual(new Date(windowStart + 60_000));
    expect(third.allowed).toBe(false);

    const row = await prisma.rateLimit.findFirstOrThrow({
      where: { key: `${prefix}:roll` },
    });
    expect(row.windowStart).toEqual(new Date(windowStart));

    vi.setSystemTime(windowStart + 60_000);
    const next = await consume(rule(2), "roll");

    expect(next).toEqual({
      allowed: true,
      limit: 2,
      remaining: 1,
      resetAt: new Date(windowStart + 120_000),
    });
  });
});

describe("pruneExpired", () => {
  it("removes windows older than a day and keeps current ones", async () => {
    const now = Date.now();
    await prisma.rateLimit.createMany({
      data: [
        { key: `${prefix}:old`, windowStart: new Date(now - 2 * 86_400_000) },
        { key: `${prefix}:current`, windowStart: new Date(now - 60_000) },
      ],
    });

    await pruneExpired();

    const keys = await prisma.rateLimit.findMany({
      where: { key: { startsWith: prefix } },
      select: { key: true },
    });
    expect(keys).toEqual([{ key: `${prefix}:current` }]);
  });
});
