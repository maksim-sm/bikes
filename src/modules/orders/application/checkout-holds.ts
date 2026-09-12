import type { InventoryServices } from "@/modules/inventory";
import type { PaymentServices } from "@/modules/payments";

export interface CheckoutHoldReconciler {
  /**
   * Payment timeouts, abandoned checkouts, and due reservations.
   * Releases each hold at most once (expire or explicit release).
   */
  reconcile(): Promise<{
    timedOutPayments: number;
    expiredReservations: number;
    abandonedPayments: number;
  }>;
}

export function createCheckoutHoldReconciler(deps: {
  inventory: InventoryServices;
  payments: PaymentServices;
}): CheckoutHoldReconciler {
  return {
    async reconcile() {
      const timedOutPayments = await deps.payments.expireDue();
      const due = await deps.inventory.listDueActive();
      const expiredReservations = await deps.inventory.expireDue();
      const orderIds = [
        ...new Set(
          due
            .map((hold) => hold.orderId)
            .filter((orderId): orderId is string => orderId !== undefined),
        ),
      ];
      const abandonedPayments = await deps.payments.expireOpenForOrders(orderIds);
      return { timedOutPayments, expiredReservations, abandonedPayments };
    },
  };
}
