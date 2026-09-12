export const REQUEST_ID_HEADER = "x-request-id";

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface SuccessEnvelope<T> {
  ok: true;
  requestId: string;
  data: T;
  meta?: PageMeta;
}

export interface ErrorEnvelope {
  ok: false;
  requestId: string;
  error: {
    code: string;
    message: string;
  };
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function readRequestId(headers: Headers): string {
  const incoming = headers.get(REQUEST_ID_HEADER)?.trim();
  return incoming && incoming.length > 0 ? incoming : newRequestId();
}

export function success<T>(
  requestId: string,
  data: T,
  meta?: PageMeta,
): SuccessEnvelope<T> {
  if (meta) {
    return { ok: true, requestId, data, meta };
  }
  return { ok: true, requestId, data };
}

export function failure(requestId: string, code: string, message: string): ErrorEnvelope {
  return { ok: false, requestId, error: { code, message } };
}
