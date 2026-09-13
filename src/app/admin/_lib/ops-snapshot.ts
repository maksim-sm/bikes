import {
  getInventoryServices,
  getNotificationServices,
  getOrderServices,
  getPaymentServices,
} from "@/app/api/_lib/compose";
import {
  detectOrderAnomalies,
  type OrderAnomaly,
  type PaymentStatus,
} from "@/modules/orders";
import type { InventoryAnomaly } from "@/modules/inventory";
import type { NotificationRecord } from "@/modules/notifications";
import type { Principal } from "@/modules/identity";

export interface OpsSnapshot {
  notifications: NotificationRecord[];
  inventory: InventoryAnomaly[];
  orders: OrderAnomaly[];
}

export async function loadOpsSnapshot(principal: Principal): Promise<OpsSnapshot> {
  const notifications = await getNotificationServices().listFailed(50);
  const inventoryServices = await getInventoryServices();
  const orderServices = await getOrderServices();
  const inventory = await inventoryServices.listAnomalies(principal);
  const orders = await orderServices.listStaffOrders(principal, {});
  const paymentStatuses = new Map<string, PaymentStatus[]>();
  const hasActiveHold = new Map<string, boolean>();
  for (const order of orders) {
    const payments = await getPaymentServices().listPaymentsForOrder(principal, order.id);
    paymentStatuses.set(
      order.id,
      payments.map((payment) => payment.status),
    );
    hasActiveHold.set(order.id, await inventoryServices.hasActiveForOrder(order.id));
  }
  return {
    notifications,
    inventory,
    orders: detectOrderAnomalies({
      orders,
      paymentStatuses,
      hasActiveHold,
    }),
  };
}
