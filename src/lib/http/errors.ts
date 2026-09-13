import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  UnauthenticatedError,
  UnavailableError,
  ValidationError,
  isAppError,
} from "@/lib/errors";
import { systemMessage } from "@/lib/i18n";

export interface HttpErrorView {
  status: number;
  code: string;
  message: string;
  retryAfterSec?: number;
}

export function retryAfterSeconds(error: unknown): number | undefined {
  if (!isAppError(error) || error.code !== "rate_limited") {
    return undefined;
  }
  const value = error.context.retryAfterSec;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : undefined;
}

const STATUS_BY_CODE: Record<string, number> = {
  validation_failed: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  unavailable: 503,
};

/**
 * Map a thrown value to a client-safe HTTP view. Stack traces and AppError
 * context stay on the server.
 */
export function toHttpError(error: unknown): HttpErrorView {
  if (isAppError(error)) {
    const retryAfterSec = retryAfterSeconds(error);
    return {
      status: STATUS_BY_CODE[error.code] ?? 400,
      code: error.code,
      message: systemMessage(error.code),
      ...(retryAfterSec !== undefined ? { retryAfterSec } : {}),
    };
  }
  return {
    status: 500,
    code: "internal_error",
    message: systemMessage("internal_error"),
  };
}

export function httpStatusForCode(code: string): number {
  return STATUS_BY_CODE[code] ?? 500;
}

export {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  UnauthenticatedError,
  UnavailableError,
  ValidationError,
};
