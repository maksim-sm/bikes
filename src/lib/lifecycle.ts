/**
 * Process drain flag for readiness. Liveness stays up so the platform does
 * not kill a process that is finishing in-flight requests (ADR-0046).
 */
let draining = false;
let handlersInstalled = false;

export const DRAIN_MS = 10_000;

export function isDraining(): boolean {
  return draining;
}

export function beginDrain(): void {
  draining = true;
}

/** Test-only. */
export function resetLifecycle(): void {
  draining = false;
}

export function installProcessLifecycle(): void {
  if (handlersInstalled || process.env.VITEST) {
    return;
  }
  handlersInstalled = true;

  const onSignal = (signal: string): void => {
    if (draining) {
      return;
    }
    beginDrain();
    void import("./logger").then(({ logger }) => {
      logger.info("process.shutdown", { signal, drainMs: DRAIN_MS });
    });
    setTimeout(() => {
      void disconnectPrisma().finally(() => {
        process.exit(0);
      });
    }, DRAIN_MS);
  };

  process.on("SIGTERM", () => {
    onSignal("SIGTERM");
  });
  process.on("SIGINT", () => {
    onSignal("SIGINT");
  });
}

async function disconnectPrisma(): Promise<void> {
  try {
    const { prisma } = await import("./db");
    await prisma.$disconnect();
  } catch {
    // Client may never have been constructed.
  }
}
