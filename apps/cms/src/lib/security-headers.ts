// Response security headers (docs/SECURITY_REVIEW.md #7), applied to
// every route by next.config.ts. HSTS isn't here: Vercel already sends it.

export type Header = { key: string; value: string };

/**
 * The CSP has no nonces: they'd force every page into dynamic rendering
 * (see Next's bundled content-security-policy guide), so Next's inline
 * bootstrap scripts need 'unsafe-inline'. Everything else is locked to
 * the app's own origin, except images (Blob media, CardGrid URLs).
 */
export function securityHeaders({ isDev }: { isDev: boolean }): Header[] {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}
