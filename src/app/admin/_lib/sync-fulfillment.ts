import { getOrderServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import type { Principal } from "@/modules/identity";

export async function syncOrderFulfillment(
  principal: Principal,
  orderId: string,
  type: "assigned" | "shipped" | "delivered" | "failed" | "cancelled",
): Promise<void> {
  try {
    await (await getOrderServices()).applyFulfillmentEvent(orderId, principal, { type });
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") {
      return;
    }
    throw error;
  }
}
