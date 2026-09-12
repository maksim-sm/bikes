import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
  isAppError,
} from "@/lib/errors";

export interface HttpErrorView {
  status: number;
  code: string;
  message: string;
}

const STATUS_BY_CODE: Record<string, number> = {
  validation_failed: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
};

/**
 * Map a thrown value to a client-safe HTTP view. Stack traces and AppError
 * context stay on the server.
 */
export function toHttpError(error: unknown): HttpErrorView {
  if (isAppError(error)) {
    return {
      status: STATUS_BY_CODE[error.code] ?? 400,
      code: error.code,
      message: error.message,
    };
  }
  return {
    status: 500,
    code: "internal_error",
    message: "internal error",
  };
}

export function httpStatusForCode(code: string): number {
  return STATUS_BY_CODE[code] ?? 500;
}

export {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
};
