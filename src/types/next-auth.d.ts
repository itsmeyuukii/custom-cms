import type { DefaultSession } from "next-auth";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      // Role v2 (docs/RBAC_PLAN.md §3): slugs of the roles the user held
      // at login. Frozen until re-login; each role's current permissions
      // are still looked up fresh on every check via requirePermission.
      roleSlugs: string[];
    } & DefaultSession["user"];
  }

  interface User {
    roleSlugs?: string[];
  }
}
