import { capabilitiesForRoles, type Capability, type StaffRole } from "./roles";
import { isAuthenticated, isStaff, type Principal } from "./principal";

export function isAnonymous(
  principal: Principal,
): principal is Extract<Principal, { type: "anonymous" }> {
  return principal.type === "anonymous";
}

export function isCustomer(
  principal: Principal,
): principal is Extract<Principal, { type: "customer" }> {
  return principal.type === "customer";
}

export function staffRolesOf(principal: Principal): readonly StaffRole[] {
  return principal.type === "staff" ? principal.roles : [];
}

export function hasCapability(principal: Principal, capability: Capability): boolean {
  if (!isStaff(principal)) {
    return false;
  }
  return capabilitiesForRoles(principal.roles).has(capability);
}

/**
 * Assigned job title, plus implication: admin satisfies every role check;
 * manager satisfies inventory and order-management.
 */
export function hasStaffRole(principal: Principal, role: StaffRole): boolean {
  if (!isStaff(principal)) {
    return false;
  }
  if (principal.roles.includes("admin")) {
    return true;
  }
  if (principal.roles.includes(role)) {
    return true;
  }
  return (
    (role === "inventory" || role === "order_management") &&
    principal.roles.includes("manager")
  );
}

export function isSelf(principal: Principal, resourceUserId: string): boolean {
  return isAuthenticated(principal) && principal.userId === resourceUserId;
}

export function canReadCustomerResource(
  principal: Principal,
  ownerUserId: string,
): boolean {
  return isSelf(principal, ownerUserId) || hasCapability(principal, "read_any_customer");
}

export function canWriteCustomerResource(
  principal: Principal,
  ownerUserId: string,
): boolean {
  return isSelf(principal, ownerUserId) || hasCapability(principal, "read_any_customer");
}

export function canReadOrder(principal: Principal, orderUserId: string | null): boolean {
  if (hasCapability(principal, "manage_orders")) {
    return true;
  }
  if (orderUserId === null) {
    return false;
  }
  return isSelf(principal, orderUserId);
}

export function canManageInventory(principal: Principal): boolean {
  return hasCapability(principal, "manage_inventory");
}
