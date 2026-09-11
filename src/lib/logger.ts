import { env } from "@/lib/config";

/**
 * Structured JSON logging. Per `docs/architecture.md`, committed code uses this
 * rather than bare `console.log`, so every line is parseable and carries the
 * request id needed to reconstruct one customer's session from logs.
 *
 * Never pass passwords, session tokens, payment card data, provider secrets, or
 * raw webhook bodies to these functions.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

const severity: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  if (severity[level] < severity[env.LOG_LEVEL]) return;

  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...context,
  });

  if (level === "error") {
    console.error(line);
  } else {
    console.warn(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
