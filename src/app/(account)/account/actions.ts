"use server";

import { redirect } from "next/navigation";
import { getAuthServices, getCustomerServices } from "@/app/api/_lib/compose";
import { cookieSecurity, readSessionToken, writeSessionCookie } from "@/app/_lib/session";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { requireAccountCustomer } from "../_lib/guard";
import { accountHref } from "../_lib/paths";

export type AccountFormState = { ok: boolean; message: string } | null;

function fail(error: unknown, fallback: string): AccountFormState {
  if (isAppError(error) && error.code === "validation_failed") {
    if (error.message.includes("current password")) {
      return { ok: false, message: t.account.passwordWrong };
    }
    if (error.message.includes("password")) {
      return { ok: false, message: t.account.passwordPolicy };
    }
    return { ok: false, message: t.account.profileFailed };
  }
  return { ok: false, message: fallback };
}

export async function updateProfileAction(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const principal = await requireAccountCustomer();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  try {
    await getCustomerServices().updateProfile(principal, principal.userId, {
      firstName,
      lastName,
      phone: phoneRaw.length > 0 ? phoneRaw : null,
    });
    return { ok: true, message: t.account.profileSaved };
  } catch (error) {
    return fail(error, t.account.profileFailed);
  }
}

export async function addAddressAction(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const principal = await requireAccountCustomer();
  const label = String(formData.get("label") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  if (!label || !recipientName || !phone || !region || !city || !street || !postalCode) {
    return { ok: false, message: t.account.addressFailed };
  }
  try {
    await getCustomerServices().addAddress(principal, principal.userId, {
      label,
      recipientName,
      phone,
      countryCode: "BY",
      region,
      city,
      street,
      postalCode,
      isDefault: String(formData.get("isDefault") ?? "") === "on",
    });
    return { ok: true, message: t.account.addressSaved };
  } catch (error) {
    return fail(error, t.account.addressFailed);
  }
}

export async function setDefaultAddressAction(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const principal = await requireAccountCustomer();
  const addressId = String(formData.get("addressId") ?? "").trim();
  if (!addressId) {
    return { ok: false, message: t.account.addressFailed };
  }
  try {
    await getCustomerServices().setDefaultAddress(principal, principal.userId, addressId);
    return { ok: true, message: t.account.defaultSaved };
  } catch (error) {
    return fail(error, t.account.addressFailed);
  }
}

export async function changePasswordAction(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const principal = await requireAccountCustomer();
  try {
    const result = await (
      await getAuthServices()
    ).changePassword({
      principal,
      currentPassword: String(formData.get("currentPassword") ?? ""),
      password: String(formData.get("password") ?? ""),
      requestId: "account-password",
      rateKey: `account-password:${principal.userId}`,
      secureCookie: cookieSecurity(),
    });
    await writeSessionCookie(result.cookie);
    return { ok: true, message: t.account.passwordChanged };
  } catch (error) {
    return fail(error, t.account.passwordFailed);
  }
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionToken();
  const result = await (
    await getAuthServices()
  ).logout({
    rawToken: token,
    requestId: "account-logout",
    secureCookie: cookieSecurity(),
  });
  await writeSessionCookie(result.cookie);
  redirect(accountHref("/login"));
}

export async function logoutAllAction(
  _previous: AccountFormState,
  _formData: FormData,
): Promise<AccountFormState> {
  const principal = await requireAccountCustomer();
  try {
    const result = await (
      await getAuthServices()
    ).logoutAllSessions({
      principal,
      requestId: "account-logout-all",
      secureCookie: cookieSecurity(),
    });
    await writeSessionCookie(result.cookie);
  } catch (error) {
    return fail(error, t.account.logoutAllFailed);
  }
  redirect(accountHref("/login"));
}
