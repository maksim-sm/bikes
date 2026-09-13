/**
 * Browser security headers. Values are shared by `next.config.ts` (static
 * files) and `src/middleware.ts` (HTML and API, plus a per-request CSP nonce).
 *
 * The CSP does not allow third-party script or style hosts. A widget that
 * needs `script-src https://…` does not get an exception here.
 */

export const HSTS_HEADER = "max-age=31536000; includeSubDomains";

export const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

export const STATIC_SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

export function contentSecurityPolicy(input: {
  nonce: string;
  upgradeInsecureRequests: boolean;
  allowUnsafeEval: boolean;
}): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${input.nonce}'`,
    "'strict-dynamic'",
    ...(input.allowUnsafeEval ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src 'self' 'nonce-${input.nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(input.upgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}

export function applyStaticSecurityHeaders(headers: Headers): void {
  for (const header of STATIC_SECURITY_HEADERS) {
    headers.set(header.key, header.value);
  }
}
