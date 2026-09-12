import { getCartServices } from "@/app/api/_lib/compose";
import type { Principal } from "@/modules/identity";
import { isGuestToken } from "@/app/(storefront)/_lib/guest-cart";

export async function mergeGuestCartForPrincipal(
  principal: Principal,
  guestToken: string | null,
): Promise<boolean> {
  if (
    principal.type === "anonymous" ||
    guestToken === null ||
    !isGuestToken(guestToken)
  ) {
    return false;
  }
  const cart = await getCartServices();
  await cart.mergeOnLogin(
    { kind: "guest", guestToken },
    { kind: "customer", userId: principal.userId },
  );
  return true;
}
