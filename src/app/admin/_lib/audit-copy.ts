import { t } from "@/lib/i18n";

export function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    "catalog.product.create": t.admin.auditProductCreate,
    "catalog.product.update": t.admin.auditProductUpdate,
    "catalog.product.publish": t.admin.auditProductPublish,
    "catalog.product.unpublish": t.admin.auditProductUnpublish,
    "catalog.price.update": t.admin.auditPriceUpdate,
    "inventory.receive": t.admin.auditStockReceive,
    "inventory.adjust": t.admin.auditStockAdjust,
    "inventory.return": t.admin.auditStockReturn,
    "order.complete": t.admin.auditOrderComplete,
    "order.cancel": t.admin.auditOrderCancel,
    "payment.refund": t.admin.auditRefund,
    "customer.access": t.admin.auditCustomerAccess,
    "delivery.shipment.assign": t.admin.auditConfigAssign,
    "delivery.shipment.tracking": t.admin.auditConfigTracking,
    "delivery.shipment.ship": t.admin.auditConfigShip,
    "delivery.shipment.deliver": t.admin.auditConfigDeliver,
    "identity.roles.update": t.admin.auditRoleChange,
  };
  return labels[action] ?? action;
}

export function formatAuditJson(value: unknown): string {
  if (value === null || value === undefined) {
    return t.admin.noTime;
  }
  return JSON.stringify(value);
}
