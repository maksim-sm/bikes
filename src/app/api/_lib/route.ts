import {
  REQUEST_ID_HEADER,
  failure,
  logRequestEnd,
  logRequestError,
  logRequestStart,
  readRequestId,
  success,
  toHttpError,
  type PageMeta,
} from "@/lib/http";
import { enforcePolicy, principalUserId, resolvePrincipal } from "./auth";
import type { Principal } from "@/modules/identity";

export type AuthPolicy = "public" | "customer" | "staff";

export interface HttpContext {
  request: Request;
  requestId: string;
  principal: Principal;
  url: URL;
}

export interface HandlerResult<T> {
  data: T;
  meta?: PageMeta;
  status?: number;
}

/**
 * Wraps a Route Handler: request id, authn/authz, envelope, error mapping,
 * and request/response logs. Handlers return DTOs, never service classes.
 */
export function withRoute<T>(
  policy: AuthPolicy,
  handler: (ctx: HttpContext) => Promise<HandlerResult<T>>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const started = Date.now();
    const requestId = readRequestId(request.headers);
    const url = new URL(request.url);
    const path = url.pathname;
    let userId: string | undefined;

    try {
      const principal = enforcePolicy(await resolvePrincipal(request.headers), policy);
      userId = principalUserId(principal);
      logRequestStart({
        requestId,
        method: request.method,
        path,
        ...(userId !== undefined ? { userId } : {}),
      });

      const result = await handler({ request, requestId, principal, url });
      const status = result.status ?? 200;
      const body = success(requestId, result.data, result.meta);
      logRequestEnd({
        requestId,
        method: request.method,
        path,
        status,
        durationMs: Date.now() - started,
        ...(userId !== undefined ? { userId } : {}),
      });
      return json(status, body, requestId);
    } catch (error) {
      const view = toHttpError(error);
      logRequestError({
        requestId,
        method: request.method,
        path,
        status: view.status,
        code: view.code,
        ...(userId !== undefined ? { userId } : {}),
      });
      logRequestEnd({
        requestId,
        method: request.method,
        path,
        status: view.status,
        durationMs: Date.now() - started,
        ...(userId !== undefined ? { userId } : {}),
      });
      return json(view.status, failure(requestId, view.code, view.message), requestId);
    }
  };
}

export function json(status: number, body: unknown, requestId: string): Response {
  return Response.json(body, {
    status,
    headers: {
      [REQUEST_ID_HEADER]: requestId,
      "cache-control": "no-store",
    },
  });
}
