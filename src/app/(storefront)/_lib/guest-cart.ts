import { cookies } from "next/headers";
import type { CartActor } from "@/modules/cart";

export const GUEST_CART_COOKIE = "bikes_guest";
const GUEST_TOKEN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function getOrCreateGuestActor(): Promise<CartActor> {
  const store = await cookies();
  const existing = store.get(GUEST_CART_COOKIE)?.value;
  if (existing && GUEST_TOKEN.test(existing)) {
    return { kind: "guest", guestToken: existing };
  }
  const guestToken = crypto.randomUUID();
  store.set(GUEST_CART_COOKIE, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: THIRTY_DAYS,
  });
  return { kind: "guest", guestToken };
}
