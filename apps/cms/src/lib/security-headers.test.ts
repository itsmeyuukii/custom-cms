import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

function header(isDev: boolean, key: string) {
  return securityHeaders({ isDev }).find((h) => h.key === key)?.value;
}

function csp(isDev: boolean) {
  const value = header(isDev, "Content-Security-Policy") ?? "";
  return Object.fromEntries(
    value
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...sources] = d.split(/\s+/);
        return [name, sources];
      }),
  );
}

describe("securityHeaders", () => {
  it("forbids framing the app, both ways", () => {
    expect(header(false, "X-Frame-Options")).toBe("DENY");
    expect(csp(false)["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("sets the standard hardening headers", () => {
    expect(header(false, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(false, "Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(header(false, "Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });

  it("only loads scripts, styles and fonts from the app itself", () => {
    const policy = csp(false);

    expect(policy["default-src"]).toEqual(["'self'"]);
    // No nonces (they'd force dynamic rendering), so Next's inline
    // bootstrap scripts need 'unsafe-inline' (docs/SECURITY_REVIEW.md #7).
    expect(policy["script-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(policy["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(policy["font-src"]).toEqual(["'self'"]);
    expect(policy["connect-src"]).toEqual(["'self'"]);
  });

  it("allows images from any https origin (Blob media, CardGrid URLs)", () => {
    expect(csp(false)["img-src"]).toEqual([
      "'self'",
      "data:",
      "blob:",
      "https:",
    ]);
  });

  it("shuts off plugins, base-tag hijacking and off-site form posts", () => {
    const policy = csp(false);

    expect(policy["object-src"]).toEqual(["'none'"]);
    expect(policy["base-uri"]).toEqual(["'self'"]);
    expect(policy["form-action"]).toEqual(["'self'"]);
  });

  it("loosens only what next dev needs, and only in development", () => {
    expect(csp(true)["script-src"]).toContain("'unsafe-eval'");
    expect(csp(true)["connect-src"]).toContain("ws:");
    expect(csp(false)["script-src"]).not.toContain("'unsafe-eval'");
    expect(csp(false)["connect-src"]).not.toContain("ws:");
  });
});
