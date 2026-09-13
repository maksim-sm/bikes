import { cookies } from "next/headers";
import { getAuthServices } from "@/app/api/_lib/compose";
import { usesSecureCookies } from "@/app/api/_lib/csrf";
import {
  HOST_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  type Principal,
  type SessionCookie,
} from "@/modules/identity";

function tokenFromStore(store: {
  get(name: string): { value: string } | undefined;
}): string | null {
  return (
    store.get(HOST_SESSION_COOKIE_NAME)?.value ??
    store.get(SESSION_COOKIE_NAME)?.value ??
    null
  );
}

export async function currentPrincipal(): Promise<Principal> {
  const store = await cookies();
  return (await getAuthServices()).resolve(tokenFromStore(store));
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return tokenFromStore(store);
}

export async function writeSessionCookie(cookie: SessionCookie): Promise<void> {
  const store = await cookies();
  store.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    path: cookie.path,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
  });
}

export function cookieSecurity(): boolean {
  return usesSecureCookies();
}
