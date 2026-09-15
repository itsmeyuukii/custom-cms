import type { LegacyRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: LegacyRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: LegacyRole;
  }
}
