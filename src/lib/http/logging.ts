import { logger, type LogContext } from "@/lib/logger";

export interface RequestLog {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string;
}

export function logRequestStart(input: {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
}): void {
  const context: LogContext = {
    requestId: input.requestId,
    method: input.method,
    path: input.path,
  };
  if (input.userId !== undefined) {
    context.userId = input.userId;
  }
  logger.info("http.request", context);
}

export function logRequestEnd(input: RequestLog): void {
  const context: LogContext = {
    requestId: input.requestId,
    method: input.method,
    path: input.path,
    status: input.status,
    durationMs: input.durationMs,
  };
  if (input.userId !== undefined) {
    context.userId = input.userId;
  }
  logger.info("http.response", context);
}

export function logRequestError(input: {
  requestId: string;
  method: string;
  path: string;
  status: number;
  code: string;
  userId?: string;
}): void {
  const context: LogContext = {
    requestId: input.requestId,
    method: input.method,
    path: input.path,
    status: input.status,
    code: input.code,
  };
  if (input.userId !== undefined) {
    context.userId = input.userId;
  }
  logger.error("http.error", context);
}
