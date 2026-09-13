"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverActionRateKey } from "@/app/api/_lib/abuse";
import { getAuthServices } from "@/app/api/_lib/compose";
import { mergeGuestCartForPrincipal } from "@/app/_lib/complete-login";
import { cookieSecurity, writeSessionCookie } from "@/app/_lib/session";
import {
  GUEST_CART_COOKIE,
  clearGuestCartCookie,
} from "@/app/(storefront)/_lib/guest-cart";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { DEMO_CUSTOMER_EMAIL, DEMO_CUSTOMER_PASSWORD } from "@/modules/identity";
import { accountHref } from "../_lib/paths";

export type LoginState = { ok: false; message: string } | null;

async function signIn(email: string, password: string): Promise<LoginState> {
  let next = "/account";
  try {
    const auth = await getAuthServices();
    const result = await auth.login({
      email,
      password,
      requestId: "account-login",
      rateKey: await serverActionRateKey("login"),
      secureCookie: cookieSecurity(),
    });
    await writeSessionCookie(result.cookie);
    const guestToken = (await cookies()).get(GUEST_CART_COOKIE)?.value ?? null;
    if (await mergeGuestCartForPrincipal(result.principal, guestToken)) {
      await clearGuestCartCookie();
    }
    if (result.principal.type === "staff") {
      next = "/admin";
    }
  } catch (error) {
    if (isAppError(error) && error.code === "conflict") {
      return { ok: false, message: t.account.loginUnverified };
    }
    if (isAppError(error) && error.code === "rate_limited") {
      return { ok: false, message: t.errors.rate_limited };
    }
    return { ok: false, message: t.account.loginFailed };
  }
  redirect(accountHref(next));
}

export async function customerLoginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  return signIn(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
  );
}

export async function demoCustomerLoginAction(): Promise<LoginState> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, message: t.account.loginFailed };
  }
  return signIn(DEMO_CUSTOMER_EMAIL, DEMO_CUSTOMER_PASSWORD);
}
