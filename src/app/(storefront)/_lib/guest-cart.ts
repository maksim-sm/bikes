import { cookies } from "next/headers";
import { readCookieValue, type HttpOnlyCookie } from "@/modules/identity";
import type { CartActor } from "@/modules/cart";

export const GUEST_CART_COOKIE = "bikes_guest";
export const GUEST_TOKEN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function isGuestToken(value: string): boolean {
  return GUEST_TOKEN.test(value);
}

export function readGuestToken(cookieHeader: string | null): string | null {
  const value = readCookieValue(cookieHeader, GUEST_CART_COOKIE);
  return value !== null && isGuestToken(value) ? value : null;
}

export function guestCartCookie(guestToken: string, secure: boolean): HttpOnlyCookie {
  return {
    name: GUEST_CART_COOKIE,
    value: guestToken,
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
    maxAge: 0,
  };
}

export async function getOrCreateGuestActor(): Promise<CartActor> {
  const store = await cookies();
  const existing = store.get(GUEST_CART_COOKIE)?.value;
  if (existing && isGuestToken(existing)) {
    return { kind: "guest", guestToken: existing };
  }
  const guestToken = crypto.randomUUID();
  const cookie = guestCartCookie(guestToken, process.env.NODE_ENV === "production");
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
  store.set(GUEST_CART_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}
