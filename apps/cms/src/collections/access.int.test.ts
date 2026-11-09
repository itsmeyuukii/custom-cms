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
import {
  hasCollectionAccess,
  hasReadAccess,
  requireCollectionAccess,
} from "./access";
import type { CollectionConfig } from "./types";

// Only the session is faked; the permission lookup behind it is real.
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth }));

let editKey: string;
let editOwnKey: string;
let readKey: string;
let editor: string;
let reader: string;
let nobody: string;

function config(access: CollectionConfig["access"]): CollectionConfig {
  return { slug: "test", label: "Test", fields: [], access };
}

beforeAll(async () => {
  editKey = await createPermission();
  editOwnKey = await createPermission();
  readKey = await createPermission();
  editor = await createRole([editOwnKey]);
  reader = await createRole([readKey]);
  nobody = await createRole();
});

afterAll(async () => {
  await cleanupRbac([editor, reader, nobody], [editKey, editOwnKey, readKey]);
});

beforeEach(() => {
  auth.mockReset();
});

describe("hasCollectionAccess", () => {
  it("grants access when the roles hold any one of the action's keys", async () => {
    const posts = config({ update: [editKey, editOwnKey] });

    expect(await hasCollectionAccess([editor], posts, "update")).toBe(true);
    expect(await hasCollectionAccess([nobody], posts, "update")).toBe(false);
  });

  it("fails closed when the action has no keys configured", async () => {
    expect(
      await hasCollectionAccess([editor], config({ update: [] }), "update"),
    ).toBe(false);
    expect(await hasCollectionAccess([editor], config({}), "delete")).toBe(
      false,
    );
    expect(
      await hasCollectionAccess([editor], config(undefined), "create"),
    ).toBe(false);
  });
});

describe("hasReadAccess", () => {
  it('allows anyone, even with no roles, when read is "public"', async () => {
    expect(await hasReadAccess(undefined, config({ read: "public" }))).toBe(
      true,
    );
  });

  it("checks the read keys otherwise", async () => {
    const restricted = config({ read: [readKey] });

    expect(await hasReadAccess([reader], restricted)).toBe(true);
    expect(await hasReadAccess([editor], restricted)).toBe(false);
  });

  it("fails closed when read is missing or empty", async () => {
    expect(await hasReadAccess([reader], config({}))).toBe(false);
    expect(await hasReadAccess([reader], config({ read: [] }))).toBe(false);
  });
});

describe("requireCollectionAccess", () => {
  // Built per test: the keys only exist once beforeAll has run.
  const posts = () => config({ create: [editOwnKey] });

  it("returns the session when it holds the action's access", async () => {
    const current: Session = {
      user: { id: "user_1", roleSlugs: [editor] },
      expires: "2099-01-01T00:00:00.000Z",
    };
    auth.mockResolvedValue(current);

    await expect(requireCollectionAccess(posts(), "create")).resolves.toBe(
      current,
    );
  });

  it("throws without a session or without access", async () => {
    auth.mockResolvedValue(null);
    await expect(requireCollectionAccess(posts(), "create")).rejects.toThrow(
      "Forbidden",
    );

    auth.mockResolvedValue({
      user: { id: "user_1", roleSlugs: [reader] },
      expires: "2099-01-01T00:00:00.000Z",
    });
    await expect(requireCollectionAccess(posts(), "create")).rejects.toThrow(
      "Forbidden",
    );
  });
});
