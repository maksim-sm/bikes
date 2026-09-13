import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { usesSecureCookies } from "@/app/api/_lib/csrf";
import { env } from "@/lib/config";
import { readCookieValue, type HttpOnlyCookie } from "@/modules/identity";
import type { CartActor } from "@/modules/cart";

export const GUEST_CART_COOKIE = "bikes_guest";
export const HOST_GUEST_CART_COOKIE = "__Host-bikes_guest";
export const GUEST_TOKEN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function guestCartCookieName(secure: boolean): string {
  return secure ? HOST_GUEST_CART_COOKIE : GUEST_CART_COOKIE;
}

export function isGuestToken(value: string): boolean {
  return GUEST_TOKEN.test(value);
}

export function signGuestToken(
  guestToken: string,
  secret: string = env.AUTH_SECRET,
): string {
  const mac = createHmac("sha256", secret).update(guestToken).digest("base64url");
  return `${guestToken}.${mac}`;
}

export function verifyGuestCookieValue(
  value: string,
  secret: string = env.AUTH_SECRET,
  requireSignature = env.NODE_ENV === "production",
): string | null {
  const separator = value.lastIndexOf(".");
  if (separator === -1) {
    if (requireSignature) {
      return null;
    }
    return isGuestToken(value) ? value : null;
  }
  const token = value.slice(0, separator);
  const mac = value.slice(separator + 1);
  if (!isGuestToken(token) || mac.length === 0) {
    return null;
  }
  const expected = createHmac("sha256", secret).update(token).digest("base64url");
  const given = Buffer.from(mac);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return null;
  }
  return token;
}

export function readGuestToken(cookieHeader: string | null): string | null {
  const signed =
    readCookieValue(cookieHeader, HOST_GUEST_CART_COOKIE) ??
    readCookieValue(cookieHeader, GUEST_CART_COOKIE);
  return signed === null ? null : verifyGuestCookieValue(signed);
}

export function guestCartCookie(guestToken: string, secure: boolean): HttpOnlyCookie {
  return {
    name: guestCartCookieName(secure),
    value: signGuestToken(guestToken),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: THIRTY_DAYS,
  };
}

export function clearedGuestCartCookie(secure: boolean): HttpOnlyCookie {
  return {
    ...guestCartCookie("", secure),
    value: "",
    maxAge: 0,
  };
}

export async function getOrCreateGuestActor(): Promise<CartActor> {
  const store = await cookies();
  const secure = usesSecureCookies();
  const existing =
    store.get(HOST_GUEST_CART_COOKIE)?.value ?? store.get(GUEST_CART_COOKIE)?.value;
  const verified = existing ? verifyGuestCookieValue(existing) : null;
  if (verified) {
    return { kind: "guest", guestToken: verified };
  }
  const guestToken = crypto.randomUUID();
  const cookie = guestCartCookie(guestToken, secure);
  store.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    path: cookie.path,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
  });
  return { kind: "guest", guestToken };
}

export async function clearGuestCartCookie(): Promise<void> {
  const store = await cookies();
  const secure = usesSecureCookies();
  const cookie = clearedGuestCartCookie(secure);
  store.set(cookie.name, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: cookie.secure,
    maxAge: 0,
  });
}
