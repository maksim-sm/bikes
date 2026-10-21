import { expect, test } from "../helpers/test";

test.describe("Заголовки безопасности", () => {
  test(
    "главная отдаёт все заголовки с ожидаемыми значениями",
    { tag: "@smoke" },
    async ({ page }) => {
      const response = await page.goto("/");
      expect(response?.status()).toBe(200);

      const headers = response?.headers() ?? {};

      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(headers["strict-transport-security"]).toBe("max-age=63072000");
      expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(headers["permissions-policy"]).toBe(
        "camera=(), microphone=(), geolocation=()",
      );

      const csp = headers["content-security-policy-report-only"];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      // Report-Only на старте: действующего (блокирующего) CSP быть не должно.
      expect(headers["content-security-policy"]).toBeUndefined();
    },
  );
});
