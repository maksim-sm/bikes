import { ForbiddenError, UnauthenticatedError } from "@/lib/errors";
import {
  canReadCustomerResource,
  canReadOrder,
  canWriteCustomerResource,
  hasCapability,
  hasStaffRole,
  isAnonymous,
  isCustomer,
} from "../domain/authorization";
import { isAuthenticated, isStaff, type Principal } from "../domain/principal";

export function requireAnonymous(
  principal: Principal,
): Extract<Principal, { type: "anonymous" }> {
  if (!isAnonymous(principal)) {
    throw new ForbiddenError("anonymous role required");
  }
  return principal;
}

export function requireCustomer(
  principal: Principal,
): Extract<Principal, { type: "customer" }> {
  if (!isAuthenticated(principal)) {
    throw new UnauthenticatedError("authentication required");
  }
  if (!isCustomer(principal)) {
    throw new ForbiddenError("customer role required");
  }
  return principal;
}

export function requireAuthenticated(
  principal: Principal,
): Extract<Principal, { type: "customer" | "staff" }> {
  if (!isAuthenticated(principal)) {
    throw new UnauthenticatedError("authentication required");
  }
  return principal;
}

export function requireStaff(
  principal: Principal,
): Extract<Principal, { type: "staff" }> {
  if (!isAuthenticated(principal)) {
    throw new UnauthenticatedError("authentication required");
  }
  if (!isStaff(principal)) {
    throw new ForbiddenError("staff role required");
  }
  return principal;
}

export function requireAdmin(
  principal: Principal,
): Extract<Principal, { type: "staff" }> {
  const staff = requireStaff(principal);
  if (!hasStaffRole(staff, "admin")) {
    throw new ForbiddenError("admin role required");
  }
  return staff;
}

export function requireManager(
  principal: Principal,
): Extract<Principal, { type: "staff" }> {
  const staff = requireStaff(principal);
  if (!hasStaffRole(staff, "manager")) {
    throw new ForbiddenError("manager role required");
  }
  return staff;
}

export function requireInventoryRole(
  principal: Principal,
): Extract<Principal, { type: "staff" }> {
  const staff = requireStaff(principal);
  if (!hasStaffRole(staff, "inventory")) {
    throw new ForbiddenError("inventory role required");
  }
  return staff;
}

export function requireOrderManagementRole(
  principal: Principal,
): Extract<Principal, { type: "staff" }> {
  const staff = requireStaff(principal);
  if (!hasStaffRole(staff, "order_management")) {
    throw new ForbiddenError("order-management role required");
  }
  return staff;
}

export function requireCatalogRole(
  principal: Principal,
): Extract<Principal, { type: "staff" }> {
  const staff = requireStaff(principal);
  if (!hasCapability(staff, "manage_catalog")) {
    throw new ForbiddenError("catalog role required");
  }
  return staff;
}

export function assertCanReadCustomerResource(
  principal: Principal,
  ownerUserId: string,
): void {
  requireAuthenticated(principal);
  if (!canReadCustomerResource(principal, ownerUserId)) {
    throw new ForbiddenError("resource does not belong to the caller", {
      ownerUserId,
    });
  }
}

export function assertCanWriteCustomerResource(
  principal: Principal,
  ownerUserId: string,
): void {
  requireAuthenticated(principal);
  if (!canWriteCustomerResource(principal, ownerUserId)) {
    throw new ForbiddenError("resource does not belong to the caller", {
      ownerUserId,
    });
  }
}

export function assertCanReadOrder(
  principal: Principal,
  orderUserId: string | null,
  orderId: string,
): void {
  requireAuthenticated(principal);
  if (!canReadOrder(principal, orderUserId)) {
    throw new ForbiddenError("order does not belong to the caller", { orderId });
  }
}
