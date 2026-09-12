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
import { serializeCookie, type SessionCookie } from "@/modules/identity";
import type { Principal } from "@/modules/identity";
import {
  enforcePolicy,
  principalUserId,
  resolvePrincipal,
  type AuthPolicy,
} from "./auth";
import { assertSameOrigin } from "./csrf";

export type { AuthPolicy } from "./auth";

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
  cookies?: SessionCookie[];
}

/**
 * Wraps a Route Handler: request id, authn/authz, envelope, error mapping,
 * and request/response logs. Handlers return DTOs, never service classes.
 */
export function withRoute<T>(
  policy: AuthPolicy,
  handler: (ctx: HttpContext) => Promise<HandlerResult<T>>,
  options?: { csrf?: boolean },
): (request: Request) => Promise<Response> {
  const csrf = options?.csrf ?? true;
  return async (request: Request) => {
    const started = Date.now();
    const requestId = readRequestId(request.headers);
    const url = new URL(request.url);
    const path = url.pathname;
    let userId: string | undefined;

    try {
      if (csrf) {
        assertSameOrigin(request);
      }
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
      return json(status, body, requestId, result.cookies);
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

export function json(
  status: number,
  body: unknown,
  requestId: string,
  cookies: SessionCookie[] = [],
): Response {
  const headers = new Headers({
    [REQUEST_ID_HEADER]: requestId,
    "cache-control": "no-store",
    "content-type": "application/json",
  });
  for (const cookie of cookies) {
    headers.append("set-cookie", serializeCookie(cookie));
  }
  return new Response(JSON.stringify(body), { status, headers });
}
