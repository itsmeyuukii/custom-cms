import type { LegacyRole } from "@prisma/client";
import { auth } from "@/lib/auth";

/** Roles allowed to create/edit content (everything short of user management). */
export const WRITE_ROLES: LegacyRole[] = ["ADMIN", "EDITOR"];

/** Plain boolean check, for conditionally rendering UI. */
export function hasRole(
  role: LegacyRole | undefined | null,
  allowed: LegacyRole[],
): boolean {
  return !!role && allowed.includes(role);
}

/**
 * Throws if there's no session or the session's role isn't in `allowed`.
 * Mirrors the `access: Role[]` shape planned for Collections
 * (see docs/COLLECTIONS_PLAN.md) so both systems share one permission
 * idiom instead of two.
 */
export async function requireRole(allowed: LegacyRole[]) {
  const session = await auth();

  if (!session?.user?.id || !hasRole(session.user.role, allowed)) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return session;
}
