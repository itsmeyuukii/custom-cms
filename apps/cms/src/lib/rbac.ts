import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Whether any of the given roles currently grants `key`, looked up fresh
 * from the database every call. See docs/RBAC_PLAN.md §3: unlike role
 * assignment (frozen in the session JWT until re-login), a role's
 * permissions are never cached, so revoking one takes effect immediately
 * for everyone who holds that role.
 */
async function roleSlugsHavePermission(
  roleSlugs: string[],
  key: string,
): Promise<boolean> {
  if (roleSlugs.length === 0) return false;

  const allowed = await prisma.rolePermission.findFirst({
    where: {
      permission: { key },
      role: { slug: { in: roleSlugs } },
    },
  });

  return !!allowed;
}

/** Plain boolean check, for conditionally rendering UI. */
export async function hasPermission(
  roleSlugs: string[] | undefined,
  key: string,
): Promise<boolean> {
  return roleSlugsHavePermission(roleSlugs ?? [], key);
}

/**
 * Throws if there's no session or the session's roles don't grant `key`.
 * Replaces requireRole — same call-site shape (docs/RBAC_PLAN.md §4).
 */
export async function requirePermission(key: string) {
  const session = await auth();

  if (
    !session?.user?.id ||
    !(await roleSlugsHavePermission(session.user.roleSlugs, key))
  ) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return session;
}
