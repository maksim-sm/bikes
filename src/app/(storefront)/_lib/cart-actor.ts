import { cookies } from "next/headers";
import { getAuthServices } from "@/app/api/_lib/compose";
import { SESSION_COOKIE_NAME, type Principal } from "@/modules/identity";
import type { CartActor } from "@/modules/cart";
import { getOrCreateGuestActor, isGuestToken, readGuestToken } from "./guest-cart";

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

export async function resolveCartActor(): Promise<CartActor> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value ?? null;
  const principal = await (await getAuthServices()).resolve(token);
  const authenticated = actorFromPrincipal(principal);
  if (authenticated) {
    return authenticated;
  }
  return getOrCreateGuestActor();
}

export function guestActorFromCookieValue(value: string | undefined): CartActor | null {
  if (!value || !isGuestToken(value)) {
    return null;
  }
  return { kind: "guest", guestToken: value };
}
