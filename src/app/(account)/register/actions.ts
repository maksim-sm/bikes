"use server";

import { getAuthServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";

export type RegisterState = { ok: boolean; message: string } | null;

export async function customerRegisterAction(
  _previous: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  try {
    await (
      await getAuthServices()
    ).register({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      requestId: "account-register",
      rateKey: "account-register",
    });
    return { ok: true, message: t.account.registerDone };
  } catch (error) {
    if (isAppError(error) && error.code === "validation_failed") {
      return { ok: false, message: t.account.registerFailed };
    }
    return { ok: false, message: t.account.registerFailed };
  }
}
