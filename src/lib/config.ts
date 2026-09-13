import { z } from "zod";

/**
 * The single place environment variables enter the application.
 *
 * Nothing else may read `process.env`. Validation happens once, eagerly, so a
 * misconfigured deployment fails at startup with a readable message rather than
 * at 2am inside a checkout request.
 *
 * Named environments (local, test, staging, production) are documented in
 * docs/environments.md (ADR-0043). Production `next start` — staging and
 * live — requires DATABASE_URL, an https APP_URL, and AUTH_SECRET.
 * `next build` sets NODE_ENV=production but NEXT_PHASE is
 * `phase-production-build`; secrets are not demanded then so CI can compile
 * without live credentials (ADR-0041).
 */
const DEV_DATABASE_URL = "postgresql://bikes:bikes@localhost:5432/bikes";
const DEV_APP_URL = "http://localhost:3000";

/** Used only when production secrets are not being enforced. Never in `next start`. */
export const DEV_AUTH_SECRET = "dev-only-auth-secret-not-for-production";

const postgresUrl = z
  .string()
  .min(1)
  .refine((value) => value.startsWith("postgres"), "Must be a PostgreSQL connection URL");

const authSecret = z
  .string()
  .min(32, "Must be at least 32 characters so it has enough entropy to sign cookies");

export type Env = {
  NODE_ENV: "development" | "test" | "production";
  APP_URL: string;
  APP_LOCALE: "ru";
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  DATABASE_URL: string;
  AUTH_SECRET: string;
  BUILD_ID?: string;
};

/** Partial process.env bag. Next.js types NODE_ENV as required; tests pass `{}`. */
export type EnvSource = Record<string, string | undefined>;

export function isProductionBuildPhase(source: EnvSource = process.env): boolean {
  return source.NEXT_PHASE === "phase-production-build";
}

export function enforceProductionSecrets(
  source: EnvSource = process.env,
  nodeEnv: Env["NODE_ENV"] = (source.NODE_ENV as Env["NODE_ENV"]) ?? "development",
): boolean {
  return nodeEnv === "production" && !isProductionBuildPhase(source);
}

function blankToUndefined(value: unknown): unknown {
  return value === "" ? undefined : value;
}

export function parseEnv(source: EnvSource): Env {
  const nodeEnvResult = z
    .enum(["development", "test", "production"])
    .default("development")
    .safeParse(blankToUndefined(source.NODE_ENV));
  if (!nodeEnvResult.success) {
    throw invalidEnv(nodeEnvResult.error.issues);
  }
  const nodeEnv = nodeEnvResult.data;
  const strict = enforceProductionSecrets(source, nodeEnv);

  const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: strict
      ? z
          .url()
          .refine(
            (value) => value.startsWith("https://"),
            "Must be an https origin in production",
          )
      : z.url().default(DEV_APP_URL),
    APP_LOCALE: z.literal("ru").default("ru"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    DATABASE_URL: strict ? postgresUrl : postgresUrl.default(DEV_DATABASE_URL),
    AUTH_SECRET: strict ? authSecret : authSecret.default(DEV_AUTH_SECRET),
    BUILD_ID: z.string().min(1).max(64).optional(),
  });

  const parsed = schema.safeParse({
    NODE_ENV: blankToUndefined(source.NODE_ENV),
    APP_URL: blankToUndefined(source.APP_URL),
    APP_LOCALE: blankToUndefined(source.APP_LOCALE),
    LOG_LEVEL: blankToUndefined(source.LOG_LEVEL),
    DATABASE_URL: blankToUndefined(source.DATABASE_URL),
    AUTH_SECRET: blankToUndefined(source.AUTH_SECRET),
    BUILD_ID: blankToUndefined(source.BUILD_ID),
  });
  if (!parsed.success) {
    throw invalidEnv(parsed.error.issues);
  }
  const { BUILD_ID, ...required } = parsed.data;
  if (BUILD_ID === undefined) {
    return required;
  }
  return { ...required, BUILD_ID };
}

function invalidEnv(issues: readonly { path: PropertyKey[]; message: string }[]): Error {
  const problems = issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  return new Error(
    `Invalid environment configuration:\n${problems}\n\n` +
      `Copy .env.example to .env.local and fill in the missing values.`,
  );
}

function load(): Env {
  return parseEnv(process.env);
}

export const env: Env = load();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";

export function publicOriginIsHttps(appUrl: string = env.APP_URL): boolean {
  return appUrl.startsWith("https://");
}
