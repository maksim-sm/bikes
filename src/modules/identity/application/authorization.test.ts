import { describe, expect, it } from "vitest";
import { ForbiddenError, UnauthenticatedError } from "@/lib/errors";
import {
  canReadCustomerResource,
  canReadOrder,
  hasStaffRole,
} from "../domain/authorization";
import {
  anonymousPrincipal,
  customerPrincipal,
  staffPrincipal,
} from "../domain/principal";
import {
  assertCanReadCustomerResource,
  assertCanReadOrder,
  requireAdmin,
  requireAnonymous,
  requireCatalogRole,
  requireCustomer,
  requireInventoryRole,
  requireManager,
  requireOrderManagementRole,
  requireStaff,
} from "./authorization";

describe("authorization helpers", () => {
  const guest = anonymousPrincipal();
  const customer = customerPrincipal("cust-1");
  const other = customerPrincipal("cust-2");
  const inventory = staffPrincipal("s1", ["inventory"]);
  const orders = staffPrincipal("s2", ["order_management"]);
  const manager = staffPrincipal("s3", ["manager"]);
  const admin = staffPrincipal("s4", ["admin"]);

  it("names anonymous, customer, and each staff job title", () => {
    expect(requireAnonymous(guest).type).toBe("anonymous");
    expect(() => requireAnonymous(customer)).toThrow(ForbiddenError);
    expect(requireCustomer(customer).userId).toBe("cust-1");
    expect(() => requireCustomer(guest)).toThrow(UnauthenticatedError);
    expect(() => requireCustomer(admin)).toThrow(ForbiddenError);
    expect(requireStaff(inventory).type).toBe("staff");
    expect(() => requireStaff(customer)).toThrow(ForbiddenError);
    expect(requireAdmin(admin).roles).toContain("admin");
    expect(() => requireAdmin(manager)).toThrow(ForbiddenError);
    expect(requireManager(manager).roles).toContain("manager");
    expect(requireManager(admin).roles).toContain("admin");
    expect(() => requireManager(inventory)).toThrow(ForbiddenError);
    expect(requireInventoryRole(inventory).roles).toContain("inventory");
    expect(requireInventoryRole(manager).roles).toContain("manager");
    expect(() => requireInventoryRole(orders)).toThrow(ForbiddenError);
    expect(requireOrderManagementRole(orders).roles).toContain("order_management");
    expect(() => requireOrderManagementRole(inventory)).toThrow(ForbiddenError);
    expect(requireCatalogRole(manager).roles).toContain("manager");
    expect(requireCatalogRole(admin).roles).toContain("admin");
    expect(() => requireCatalogRole(inventory)).toThrow(ForbiddenError);
  });

  it("keeps customer records to the owner, manager, or admin", () => {
    expect(canReadCustomerResource(customer, "cust-1")).toBe(true);
    expect(canReadCustomerResource(other, "cust-1")).toBe(false);
    expect(canReadCustomerResource(inventory, "cust-1")).toBe(false);
    expect(canReadCustomerResource(orders, "cust-1")).toBe(false);
    expect(canReadCustomerResource(manager, "cust-1")).toBe(true);
    expect(canReadCustomerResource(admin, "cust-1")).toBe(true);
    expect(() => assertCanReadCustomerResource(other, "cust-1")).toThrow(ForbiddenError);
    expect(() => assertCanReadCustomerResource(guest, "cust-1")).toThrow(
      UnauthenticatedError,
    );
  });

  it("lets only the owner or order-management staff read an order", () => {
    expect(canReadOrder(customer, "cust-1")).toBe(true);
    expect(canReadOrder(other, "cust-1")).toBe(false);
    expect(canReadOrder(inventory, "cust-1")).toBe(false);
    expect(canReadOrder(orders, "cust-1")).toBe(true);
    expect(hasStaffRole(manager, "order_management")).toBe(true);
    expect(() => assertCanReadOrder(other, "cust-1", "o1")).toThrow(ForbiddenError);
  });
});
