/**
 * Runs when the Node server process starts (`next start`), not during
 * `next build`. Importing config re-runs production secret checks.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }
  await import("@/lib/config");
}
