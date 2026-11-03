import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientIp, consume, type RateLimitRule } from "@/lib/rate-limit";

// Login limits (docs/RATE_LIMIT_PLAN.md §3). Per IP + email stops guessing
// one account; per IP stops spraying many. No email-only limit: it would
// let anyone lock a real user out.
const LOGIN_IP_EMAIL: RateLimitRule = {
  name: "login:ip-email",
  limit: 5,
  windowSeconds: 15 * 60,
};
const LOGIN_IP: RateLimitRule = {
  name: "login:ip",
  limit: 30,
  windowSeconds: 15 * 60,
};

// Reaches the client as `code: "rate_limited"` from signIn(), so the login
// page can tell it apart from a wrong password.
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Before the user lookup and bcrypt, so a blocked attempt is cheap.
        // Every attempt counts against both limits, successful or not.
        const ip = clientIp(request.headers);
        const [perAccount, perIp] = await Promise.all([
          consume(LOGIN_IP_EMAIL, `${ip}:${email.toLowerCase()}`),
          consume(LOGIN_IP, ip),
        ]);
        if (!perAccount.allowed || !perIp.allowed) {
          throw new RateLimitedSignin();
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { roles: { include: { role: true } } },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roleSlugs: user.roles.map((userRole) => userRole.role.slug),
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.roleSlugs = (user as { roleSlugs?: string[] }).roleSlugs ?? [];
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.roleSlugs =
          (token.roleSlugs as string[] | undefined) ?? [];
      }
      return session;
    },
  },
});
