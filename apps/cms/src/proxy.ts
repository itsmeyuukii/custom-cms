import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { clientIp, consume, type RateLimitRule } from "@/lib/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

// Public API limit (docs/RATE_LIMIT_PLAN.md §4).
const API_IP: RateLimitRule = { name: "api:ip", limit: 120, windowSeconds: 60 };

const adminProxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
});

async function limitApi(req: NextRequest) {
  let result;
  try {
    result = await consume(API_IP, clientIp(req.headers));
  } catch (error) {
    // Fail open: the API only serves public, published content.
    console.error("API rate limit check failed", error);
    return NextResponse.next();
  }

  const headers = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
  };

  if (!result.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    );
    const response = apiError(
      "RATE_LIMITED",
      "Too many requests. Try again later.",
      429,
    );
    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value);
    }
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }

  return NextResponse.next({ headers });
}

export default async function proxy(req: NextRequest) {
  // API requests skip the auth() wrapper: it can write session cookies onto
  // responses, and a public API response has no reason to touch them.
  if (req.nextUrl.pathname.startsWith("/api/v1/")) return limitApi(req);
  // next-auth types the second argument as route-handler context; as a
  // proxy wrapper it only forwards it to the callback above, which ignores it.
  return adminProxy(req, { params: Promise.resolve({}) });
}

export const config = {
  matcher: ["/admin/:path*", "/api/v1/:path*"],
};
