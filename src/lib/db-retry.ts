/**
 * Retries a write that PostgreSQL aborted because of a deadlock or
 * serialization failure. Commerce checkouts and inventory holds collide
 * on the same `inventory_items` row; one session is cancelled and must
 * try again. Exhausted retries rethrow the last error.
 *
 * Prisma reports these as `P2034`. The driver may also surface SQLSTATE
 * `40P01` (deadlock_detected) or `40001` (serialization_failure).
 */

export const DEADLOCK_RETRY_ATTEMPTS = 3;

export function isDeadlockError(error: unknown): boolean {
  const texts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (typeof current === "object" && current !== null) {
      const record = current as {
        code?: unknown;
        message?: unknown;
        cause?: unknown;
        meta?: { code?: unknown; message?: unknown };
      };
      if (typeof record.code === "string") {
        texts.push(record.code);
      }
      if (typeof record.message === "string") {
        texts.push(record.message);
      }
      if (typeof record.meta?.code === "string") {
        texts.push(record.meta.code);
      }
      if (typeof record.meta?.message === "string") {
        texts.push(record.meta.message);
      }
      current = record.cause;
      continue;
    }
    texts.push(String(current));
    break;
  }
  const blob = texts.join(" ").toLowerCase();
  return (
    texts.includes("P2034") ||
    texts.includes("40P01") ||
    texts.includes("40001") ||
    blob.includes("deadlock") ||
    blob.includes("could not serialize access") ||
    blob.includes("write conflict")
  );
}

export async function withDeadlockRetry<T>(
  operation: () => Promise<T>,
  attempts: number = DEADLOCK_RETRY_ATTEMPTS,
): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      last = error;
      if (!isDeadlockError(error) || attempt === attempts) {
        throw error;
      }
    }
  }
  throw last;
}
