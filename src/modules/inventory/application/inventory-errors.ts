import { ConflictError } from "@/lib/errors";

export function isInsufficientAvailable(error: unknown): boolean {
  const texts = collectErrorText(error);
  return texts.some(
    (text) =>
      text.includes("insufficient available inventory") ||
      text.includes("insufficient_available"),
  );
}

export function mapInventoryWriteError(error: unknown): never {
  if (error instanceof ConflictError) {
    throw error;
  }
  if (isInsufficientAvailable(error)) {
    throw new ConflictError("insufficient available inventory");
  }
  throw error;
}

function collectErrorText(error: unknown): string[] {
  const texts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current instanceof Error) {
      texts.push(current.message);
      current = current.cause;
      continue;
    }
    if (typeof current === "object") {
      const record = current as {
        message?: unknown;
        code?: unknown;
        cause?: unknown;
        meta?: { message?: unknown };
      };
      if (typeof record.message === "string") {
        texts.push(record.message);
      }
      if (typeof record.meta?.message === "string") {
        texts.push(record.meta.message);
      }
      if (record.code === "P0001") {
        texts.push("insufficient available inventory");
      }
      current = record.cause;
      continue;
    }
    texts.push(String(current));
    break;
  }
  return texts;
}
