import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./auth";

export interface HttpOnlyCookie {
  name: string;
  value: string;
  path: "/";
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
}

export interface SessionCookie extends HttpOnlyCookie {
  name: typeof SESSION_COOKIE_NAME;
}

export function sessionCookie(
  rawToken: string,
  secure: boolean,
  maxAge = SESSION_TTL_MS / 1000,
): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge,
  };
}

export function clearedSessionCookie(secure: boolean): SessionCookie {
  return sessionCookie("", secure, 0);
}

export function serializeCookie(cookie: HttpOnlyCookie): string {
  const parts = [
    `${cookie.name}=${cookie.value}`,
    `Path=${cookie.path}`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(cookie.maxAge)}`,
  ];
  if (cookie.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function readCookieValue(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (cookieHeader === null || cookieHeader.length === 0) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.split("=");
    if (rawName?.trim() === name) {
      const value = rest.join("=").trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}
