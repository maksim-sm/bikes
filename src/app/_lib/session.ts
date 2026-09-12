import { cookies } from "next/headers";
import { getAuthServices } from "@/app/api/_lib/compose";
import { usesSecureCookies } from "@/app/api/_lib/csrf";
import {
  SESSION_COOKIE_NAME,
  type Principal,
  type SessionCookie,
} from "@/modules/identity";

export async function currentPrincipal(): Promise<Principal> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value ?? null;
  return (await getAuthServices()).resolve(token);
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
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
