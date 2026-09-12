import { redirect } from "next/navigation";
import { isAppError } from "@/lib/errors";
import { requireCustomer, type Principal } from "@/modules/identity";
import { currentPrincipal } from "@/app/_lib/session";
import { accountHref } from "./paths";

export async function requireAccountCustomer(): Promise<
  Extract<Principal, { type: "customer" }>
> {
  const principal = await currentPrincipal();
  try {
    return requireCustomer(principal);
  } catch (error) {
    if (isAppError(error) && error.code === "forbidden") {
      redirect(accountHref("/admin"));
    }
    redirect(accountHref("/login"));
  }
}
