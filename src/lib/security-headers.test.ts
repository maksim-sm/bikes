import { describe, expect, it } from "vitest";
import {
  HSTS_HEADER,
  STATIC_SECURITY_HEADERS,
  contentSecurityPolicy,
} from "./security-headers";

function header(name: string): string {
  const found = STATIC_SECURITY_HEADERS.find((item) => item.key === name);
  if (!found) {
    throw new Error(`missing ${name}`);
  }
  return found.value;
}

describe("security headers", () => {
  it("pins frame, content-type, referrer, and permissions policies", () => {
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toContain("camera=()");
    expect(header("Permissions-Policy")).toContain("geolocation=()");
    expect(header("Permissions-Policy")).toContain("microphone=()");
    expect(header("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("builds a nonce CSP without third-party hosts", () => {
    const csp = contentSecurityPolicy({
      nonce: "abc123",
      upgradeInsecureRequests: true,
      allowUnsafeEval: false,
    });
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("https://");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toContain("unsafe-eval");
    expect(HSTS_HEADER).toContain("max-age=31536000");
  });

  it("allows eval only for next dev and skips HSTS upgrade on http", () => {
    const csp = contentSecurityPolicy({
      nonce: "dev",
      upgradeInsecureRequests: false,
      allowUnsafeEval: true,
    });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
