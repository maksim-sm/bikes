/**
 * Runs when the Node server process starts (`next start`), not during
 * `next build`. Importing config re-runs production secret checks.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }
  const { env, enforceProductionSecrets } = await import("@/lib/config");
  const { logger } = await import("@/lib/logger");
  const { installProcessLifecycle } = await import("@/lib/lifecycle");
  installProcessLifecycle();

  if (enforceProductionSecrets()) {
    const { pingDatabase } = await import("@/lib/readiness");
    try {
      await pingDatabase();
    } catch (error) {
      logger.error("process.start_failed", {
        reason: "database",
        message: error instanceof Error ? error.message : "ping failed",
      });
      process.exit(1);
    }
  }

  logger.info("process.start", {
    environment: env.NODE_ENV,
    ...(env.BUILD_ID !== undefined ? { buildId: env.BUILD_ID } : {}),
  });
}
