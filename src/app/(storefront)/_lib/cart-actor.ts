import { cookies } from "next/headers";
import { getAuthServices } from "@/app/api/_lib/compose";
import {
  HOST_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  type Principal,
} from "@/modules/identity";
import type { CartActor } from "@/modules/cart";
import {
  GUEST_CART_COOKIE,
  HOST_GUEST_CART_COOKIE,
  getOrCreateGuestActor,
  readGuestToken,
  verifyGuestCookieValue,
} from "./guest-cart";

export function actorFromPrincipal(principal: Principal): CartActor | null {
  if (principal.type === "anonymous") {
    return null;
  }
  return { kind: "customer", userId: principal.userId };
}

export function actorFromRequest(
  principal: Principal,
  cookieHeader: string | null,
): CartActor | null {
  const authenticated = actorFromPrincipal(principal);
  if (authenticated) {
    return authenticated;
  }
  const guestToken = readGuestToken(cookieHeader);
  return guestToken ? { kind: "guest", guestToken } : null;
}

export async function readCartActor(): Promise<CartActor | null> {
  const store = await cookies();
  const token =
    store.get(HOST_SESSION_COOKIE_NAME)?.value ??
    store.get(SESSION_COOKIE_NAME)?.value ??
    null;
  const principal = await (await getAuthServices()).resolve(token);
  const authenticated = actorFromPrincipal(principal);
  if (authenticated) {
    return authenticated;
  }
  const guest =
    store.get(HOST_GUEST_CART_COOKIE)?.value ?? store.get(GUEST_CART_COOKIE)?.value;
  return guestActorFromCookieValue(guest);
}

/** Creates a guest cookie. Call only from a Server Action or Route Handler. */
export async function resolveCartActor(): Promise<CartActor> {
  return (await readCartActor()) ?? getOrCreateGuestActor();
}

export function guestActorFromCookieValue(value: string | undefined): CartActor | null {
  if (!value) {
    return null;
  }
  const token = verifyGuestCookieValue(value);
  return token ? { kind: "guest", guestToken: token } : null;
}
