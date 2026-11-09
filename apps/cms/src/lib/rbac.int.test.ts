import type { Session } from "next-auth";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  cleanupRbac,
  createPermission,
  createRole,
} from "@/test/rbac-fixtures";
import { hasPermission, requirePermission } from "./rbac";

// Only the session is faked; the permission lookup behind it is real.
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth }));

function session(roleSlugs: string[], id = "user_1"): Session {
  return { user: { id, roleSlugs }, expires: "2099-01-01T00:00:00.000Z" };
}

let key: string;
let otherKey: string;
let granted: string;
let other: string;

beforeAll(async () => {
  key = await createPermission();
  otherKey = await createPermission();
  granted = await createRole([key]);
  other = await createRole([otherKey]);
});

afterAll(async () => {
  await cleanupRbac([granted, other], [key, otherKey]);
});

beforeEach(() => {
  auth.mockReset();
});

describe("hasPermission", () => {
  it("is true when any of the roles grants the key", async () => {
    expect(await hasPermission([granted], key)).toBe(true);
    expect(await hasPermission([other, granted], key)).toBe(true);
  });

  it("is false when no role grants the key", async () => {
    expect(await hasPermission([other], key)).toBe(false);
  });

  it("is false with no roles", async () => {
    expect(await hasPermission([], key)).toBe(false);
    expect(await hasPermission(undefined, key)).toBe(false);
  });
});

describe("requirePermission", () => {
  it("returns the session when its roles grant the key", async () => {
    const current = session([granted]);
    auth.mockResolvedValue(current);

    await expect(requirePermission(key)).resolves.toBe(current);
  });

  it("throws when the session's roles don't grant the key", async () => {
    auth.mockResolvedValue(session([other]));

    await expect(requirePermission(key)).rejects.toThrow("Forbidden");
  });

  it("throws with no session or no user id", async () => {
    auth.mockResolvedValue(null);
    await expect(requirePermission(key)).rejects.toThrow("Forbidden");

    auth.mockResolvedValue(session([granted], ""));
    await expect(requirePermission(key)).rejects.toThrow("Forbidden");
  });
});
