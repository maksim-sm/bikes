import { describe, expect, it } from "vitest";
import { DEV_AUTH_SECRET, enforceProductionSecrets, parseEnv } from "./config";

const validProduction = {
  NODE_ENV: "production",
  APP_URL: "https://bikes.example.by",
  DATABASE_URL: "postgresql://bikes:secret@db.internal:5432/bikes",
  AUTH_SECRET: "production-auth-secret-value-32ok",
} as const;

describe("parseEnv", () => {
  it("fills development defaults including the non-production auth secret", () => {
    const env = parseEnv({});
    expect(env.NODE_ENV).toBe("development");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toContain("localhost:5432");
    expect(env.AUTH_SECRET).toBe(DEV_AUTH_SECRET);
  });

  it("does not enforce production secrets during next build", () => {
    expect(
      enforceProductionSecrets({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }),
    ).toBe(false);
    const env = parseEnv({
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
    });
    expect(env.AUTH_SECRET).toBe(DEV_AUTH_SECRET);
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("fails production startup when required secrets are missing", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(/AUTH_SECRET/);
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        APP_URL: "https://bikes.example.by",
        AUTH_SECRET: validProduction.AUTH_SECRET,
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects http APP_URL and short AUTH_SECRET in production", () => {
    expect(() =>
      parseEnv({
        ...validProduction,
        APP_URL: "http://bikes.example.by",
      }),
    ).toThrow(/https/);
    expect(() =>
      parseEnv({
        ...validProduction,
        AUTH_SECRET: "too-short",
      }),
    ).toThrow(/32/);
  });

  it("accepts a complete production configuration", () => {
    const env = parseEnv({ ...validProduction, BUILD_ID: "abc123def" });
    expect(env.APP_URL).toBe("https://bikes.example.by");
    expect(env.AUTH_SECRET).toBe(validProduction.AUTH_SECRET);
    expect(env.DATABASE_URL.startsWith("postgres")).toBe(true);
    expect(env.BUILD_ID).toBe("abc123def");
  });
});
