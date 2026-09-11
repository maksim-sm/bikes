import { z } from "zod";

/**
 * The single place environment variables enter the application.
 *
 * Nothing else may read `process.env`. Validation happens once, eagerly, so a
 * misconfigured deployment fails at startup with a readable message rather than
 * at 2am inside a checkout request.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Public origin of the site, used for absolute URLs and payment return URLs. */
  APP_URL: z.url().default("http://localhost:3000"),

  /** Default and fallback locale. Russian-only for now, per ADR-0009. */
  APP_LOCALE: z.literal("ru").default("ru"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof serverSchema>;

function load(): Env {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid environment configuration:\n${problems}\n\n` +
        `Copy .env.example to .env.local and fill in the missing values.`,
    );
  }

  return parsed.data;
}

export const env: Env = load();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
