import { logger } from "@/lib/logger";
import { redactContext } from "@/lib/redact";

/**
 * Process-local error sink. A vendor (Sentry, etc.) can replace `report`
 * later; until then every unexpected failure is a JSON `error.tracked` line.
 */
export function trackError(
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(
    "error.tracked",
    redactContext({
      name: err.name,
      message: err.message.slice(0, 240),
      ...context,
    }),
  );
}

export function installErrorTracking(): void {
  if (process.env.VITEST) {
    return;
  }
  process.on("uncaughtException", (error) => {
    trackError(error, { kind: "uncaughtException" });
  });
  process.on("unhandledRejection", (reason) => {
    trackError(reason, { kind: "unhandledRejection" });
  });
}
