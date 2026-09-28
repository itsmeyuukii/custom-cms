// Shared access.<action> check for Collections (docs/COLLECTIONS_PLAN.md
// §2/§4) — one implementation used by both the generic server actions
// (which must throw) and the admin UI (which needs a plain boolean to
// decide what to render), so the two can't drift apart.

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import type { CollectionConfig } from "./types";

export type DocumentAction = "create" | "update" | "delete";

/**
 * `access.<action>` is a list of permission keys that each independently
 * grant access (OR, not AND) — matching how a collection like Posts can
 * list both `posts:edit` and a future `posts:editOwn`-style key as
 * alternatives. An action with no keys configured is a config mistake,
 * not "open to everyone" — fails closed.
 */
export async function hasCollectionAccess(
  roleSlugs: string[] | undefined,
  config: CollectionConfig,
  action: DocumentAction,
): Promise<boolean> {
  const keys = config.access?.[action];
  if (!keys || keys.length === 0) return false;

  for (const key of keys) {
    if (await hasPermission(roleSlugs, key)) return true;
  }
  return false;
}

/** Throws unless the current session holds access.<action>. Replaces requirePermission's call-site shape for collection actions. */
export async function requireCollectionAccess(
  config: CollectionConfig,
  action: DocumentAction,
) {
  const session = await auth();
  if (
    !session?.user?.id ||
    !(await hasCollectionAccess(session.user.roleSlugs, config, action))
  ) {
    throw new Error("Forbidden: insufficient permissions");
  }
  return session;
}

/**
 * `access.read` has its own shape (`"public" | string[]`, not just
 * `string[]`) since an unauthenticated public API is the common case for
 * a collection, unlike create/update/delete. No `access.read` configured
 * fails closed, same as the other actions.
 */
export async function hasReadAccess(
  roleSlugs: string[] | undefined,
  config: CollectionConfig,
): Promise<boolean> {
  const read = config.access?.read;
  if (read === "public") return true;
  if (!read || read.length === 0) return false;

  for (const key of read) {
    if (await hasPermission(roleSlugs, key)) return true;
  }
  return false;
}
