import { clientRateKey as abuseClientRateKey } from "@/lib/abuse";
import { ForbiddenError } from "@/lib/errors";
import { env } from "@/lib/config";

export function assertSameOrigin(request: Request): void {
  if (request.method === "GET" || request.method === "HEAD") {
    return;
  }
  const origin = request.headers.get("origin");
  const expected = new URL(env.APP_URL).origin;
  if (origin === null || origin !== expected) {
    throw new ForbiddenError("origin mismatch");
  }
}

export function usesSecureCookies(): boolean {
  return env.NODE_ENV === "production" || env.APP_URL.startsWith("https://");
}

export function clientRateKey(request: Request, action: string): string {
  return abuseClientRateKey(request, action);
}
