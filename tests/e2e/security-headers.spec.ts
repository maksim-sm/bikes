import { expect, test } from "@playwright/test";

test("storefront HTML sends document security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/'nonce-/);
  expect(csp).not.toContain("https://");
  expect(headers["strict-transport-security"]).toBeUndefined();
});

test("health stays reachable over http without an https redirect", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBeLessThan(400);
  expect(new URL(response.url()).protocol).toBe("http:");
});
