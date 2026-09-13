"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthServices } from "@/app/api/_lib/compose";
import { mergeGuestCartForPrincipal } from "@/app/_lib/complete-login";
import {
  GUEST_CART_COOKIE,
  clearGuestCartCookie,
} from "@/app/(storefront)/_lib/guest-cart";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD } from "@/modules/identity";
import { adminHref } from "../_lib/paths";
import {
  adminHomePath,
  canAccessAdmin,
  cookieSecurity,
  writeSessionCookie,
} from "../_lib/staff";

export type LoginState = { ok: false; message: string } | null;

async function signIn(email: string, password: string): Promise<LoginState> {
  let home = "/admin/products";
  try {
    const auth = await getAuthServices();
    const result = await auth.login({
      email,
      password,
      requestId: "admin-login",
      rateKey: "admin-login",
      secureCookie: cookieSecurity(),
    });
    if (!canAccessAdmin(result.principal)) {
      await auth.logout({
        rawToken: result.cookie.value,
        requestId: "admin-login",
        secureCookie: cookieSecurity(),
      });
      return { ok: false, message: t.admin.loginForbidden };
    }
    await writeSessionCookie(result.cookie);
    const guestToken = (await cookies()).get(GUEST_CART_COOKIE)?.value ?? null;
    if (await mergeGuestCartForPrincipal(result.principal, guestToken)) {
      await clearGuestCartCookie();
    }
    home = adminHomePath(result.principal);
  } catch (error) {
    if (isAppError(error)) {
      return { ok: false, message: t.admin.loginFailed };
    }
    return { ok: false, message: t.admin.loginFailed };
  }
  redirect(adminHref(home));
}

export async function staffLoginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  return signIn(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
  );
}

export async function demoStaffLoginAction(): Promise<LoginState> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, message: t.admin.loginFailed };
  }
  return signIn(DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD);
}

export async function staffLogoutAction(): Promise<void> {
  const { cookies } = await import("next/headers");
  const { HOST_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } = await import(
    "@/modules/identity"
  );
  const store = await cookies();
  const token =
    store.get(HOST_SESSION_COOKIE_NAME)?.value ??
    store.get(SESSION_COOKIE_NAME)?.value ??
    null;
  const auth = await getAuthServices();
  const result = await auth.logout({
    rawToken: token,
    requestId: "admin-logout",
    secureCookie: cookieSecurity(),
  });
  await writeSessionCookie(result.cookie);
  redirect(adminHref("/admin/login"));
}
