import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  HTTPS_EXEMPT,
  httpsEnforced,
  middleware,
  shouldRedirectHttpToHttps,
} from "./middleware";

function request(path: string, init?: { proto?: string }): NextRequest {
  const headers = new Headers();
  if (init?.proto) {
    headers.set("x-forwarded-proto", init.proto);
  }
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("HTTPS enforcement", () => {
  it("is on only for production https origins", () => {
    expect(httpsEnforced("production", "https://bikes.example.by")).toBe(true);
    expect(httpsEnforced("production", "http://localhost:3000")).toBe(false);
    expect(httpsEnforced("development", "https://bikes.example.by")).toBe(false);
  });

  it("308-redirects http except the health check", () => {
    expect(shouldRedirectHttpToHttps("/", "http", true)).toBe(true);
    expect(shouldRedirectHttpToHttps("/", "https", true)).toBe(false);
    expect(shouldRedirectHttpToHttps("/api/health", "http", true)).toBe(false);
    expect(HTTPS_EXEMPT.has("/api/health")).toBe(true);
    expect(shouldRedirectHttpToHttps("/", "http", false)).toBe(false);
  });
});

describe("middleware security headers", () => {
  it("sets CSP, frame, nosniff, referrer, and permissions on a document request", () => {
    const response = middleware(request("/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
    expect(response.headers.get("Permissions-Policy")).toContain("payment=()");
    expect(response.headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).not.toContain("https://");
    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
  });
});
