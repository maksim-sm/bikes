/**
 * The error taxonomy domain modules throw and the app layer translates.
 *
 * Domain code raises these with a stable `code`; only the app layer decides
 * what a code means as an HTTP status or a piece of Russian-language UI copy.
 * Keeping language out of errors is what lets services be called from
 * background jobs and admin tooling (see ADR-0009).
 */
export abstract class AppError extends Error {
  abstract readonly code: string;

  constructor(
    message: string,
    readonly context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input failed validation at a boundary. */
export class ValidationError extends AppError {
  readonly code = "validation_failed";
}

/** The requested entity does not exist, or the caller may not know that it does. */
export class NotFoundError extends AppError {
  readonly code = "not_found";
}

/** The caller is not authenticated. */
export class UnauthenticatedError extends AppError {
  readonly code = "unauthenticated";
}

/** The caller is authenticated but not permitted to do this. */
export class ForbiddenError extends AppError {
  readonly code = "forbidden";
}

/** The operation conflicts with current state, e.g. insufficient stock. */
export class ConflictError extends AppError {
  readonly code = "conflict";
}

/** The caller has exceeded a rate limit. */
export class RateLimitedError extends AppError {
  readonly code = "rate_limited";
}

/** The process is draining or a dependency is not accepting traffic. */
export class UnavailableError extends AppError {
  readonly code = "unavailable";
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
