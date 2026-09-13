import { type NextRequest, NextResponse } from "next/server";
import { env, publicOriginIsHttps } from "@/lib/config";
import { REQUEST_ID_HEADER, readRequestId } from "@/lib/http";
import {
  applyStaticSecurityHeaders,
  contentSecurityPolicy,
  HSTS_HEADER,
} from "@/lib/security-headers";

export const HTTPS_EXEMPT = new Set(["/api/health", "/api/ready"]);

export function httpsEnforced(
  nodeEnv: string = env.NODE_ENV,
  appUrl: string = env.APP_URL,
): boolean {
  return nodeEnv === "production" && publicOriginIsHttps(appUrl);
}

export function requestProtocol(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")
  );
}

export function shouldRedirectHttpToHttps(
  pathname: string,
  protocol: string,
  enforceHttps: boolean,
): boolean {
  return enforceHttps && !HTTPS_EXEMPT.has(pathname) && protocol === "http";
}

export function middleware(request: NextRequest): NextResponse {
  const enforceHttps = httpsEnforced();
  if (
    shouldRedirectHttpToHttps(
      request.nextUrl.pathname,
      requestProtocol(request),
      enforceHttps,
    )
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 308);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy({
    nonce,
    upgradeInsecureRequests: enforceHttps,
    allowUnsafeEval: env.NODE_ENV === "development",
  });

  const requestId = readRequestId(request.headers);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applyStaticSecurityHeaders(response.headers);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  response.headers.set("Content-Security-Policy", csp);
  if (enforceHttps) {
    response.headers.set("Strict-Transport-Security", HSTS_HEADER);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
