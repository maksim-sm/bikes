import {
  hasCapability,
  isStaff,
  type Capability,
  type Principal,
} from "@/modules/identity";

export type AdminNavCapability = Extract<
  Capability,
  "manage_catalog" | "manage_orders" | "manage_inventory" | "read_any_customer" | "admin"
>;

export interface AdminNavItem {
  href:
    | "/admin/products"
    | "/admin/products/new"
    | "/admin/orders"
    | "/admin/deliveries"
    | "/admin/inventory"
    | "/admin/customers"
    | "/admin/staff"
    | "/admin/audit"
    | "/admin/ops";
  capability: AdminNavCapability;
  labelKey:
    | "products"
    | "newProduct"
    | "orders"
    | "deliveries"
    | "inventory"
    | "customers"
    | "staff"
    | "audit"
    | "ops";
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { href: "/admin/products", capability: "manage_catalog", labelKey: "products" },
  { href: "/admin/products/new", capability: "manage_catalog", labelKey: "newProduct" },
  { href: "/admin/orders", capability: "manage_orders", labelKey: "orders" },
  { href: "/admin/deliveries", capability: "manage_orders", labelKey: "deliveries" },
  { href: "/admin/inventory", capability: "manage_inventory", labelKey: "inventory" },
  { href: "/admin/customers", capability: "read_any_customer", labelKey: "customers" },
  { href: "/admin/staff", capability: "admin", labelKey: "staff" },
  { href: "/admin/audit", capability: "admin", labelKey: "audit" },
  { href: "/admin/ops", capability: "admin", labelKey: "ops" },
];

export function canManageCatalog(principal: Principal): boolean {
  return hasCapability(principal, "manage_catalog");
}

export function canManageOrders(principal: Principal): boolean {
  return hasCapability(principal, "manage_orders");
}

export function canManageInventory(principal: Principal): boolean {
  return hasCapability(principal, "manage_inventory");
}

export function canReadAnyCustomer(principal: Principal): boolean {
  return hasCapability(principal, "read_any_customer");
}

export function canViewAudit(principal: Principal): boolean {
  return hasCapability(principal, "admin");
}

export function canAccessAdmin(principal: Principal): boolean {
  return (
    isStaff(principal) &&
    (canManageCatalog(principal) ||
      canManageOrders(principal) ||
      canManageInventory(principal))
  );
}

export function adminHomePath(principal: Principal): string {
  if (canManageCatalog(principal)) {
    return "/admin/products";
  }
  if (canManageOrders(principal)) {
    return "/admin/orders";
  }
  if (canManageInventory(principal)) {
    return "/admin/inventory";
  }
  return "/admin/login?forbidden=1";
}

export function visibleAdminNav(principal: Principal): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => hasCapability(principal, item.capability));
}
