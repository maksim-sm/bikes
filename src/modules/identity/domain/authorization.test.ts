import { describe, expect, it } from "vitest";
import { anonymousPrincipal, customerPrincipal, staffPrincipal } from "./principal";
import {
  canManageInventory,
  canReadCustomerResource,
  canReadOrder,
  canWriteCustomerResource,
  hasCapability,
  hasStaffRole,
} from "./authorization";

describe("order and customer isolation", () => {
  const guest = anonymousPrincipal();
  const owner = customerPrincipal("cust-1");
  const other = customerPrincipal("cust-2");
  const inventory = staffPrincipal("s1", ["inventory"]);
  const orders = staffPrincipal("s2", ["order_management"]);
  const manager = staffPrincipal("s3", ["manager"]);
  const admin = staffPrincipal("s4", ["admin"]);

  it("hides a guest order from everyone except order-management staff", () => {
    expect(canReadOrder(owner, null)).toBe(false);
    expect(canReadOrder(other, null)).toBe(false);
    expect(canReadOrder(guest, null)).toBe(false);
    expect(canReadOrder(inventory, null)).toBe(false);
    expect(canReadOrder(orders, null)).toBe(true);
    expect(canReadOrder(manager, null)).toBe(true);
    expect(canReadOrder(admin, null)).toBe(true);
  });

  it("lets the owner or a customer-reading staff member write a customer resource", () => {
    expect(canWriteCustomerResource(owner, "cust-1")).toBe(true);
    expect(canWriteCustomerResource(other, "cust-1")).toBe(false);
    expect(canWriteCustomerResource(guest, "cust-1")).toBe(false);
    expect(canWriteCustomerResource(inventory, "cust-1")).toBe(false);
    expect(canWriteCustomerResource(orders, "cust-1")).toBe(false);
    expect(canWriteCustomerResource(manager, "cust-1")).toBe(true);
    expect(canWriteCustomerResource(admin, "cust-1")).toBe(true);
    expect(canReadCustomerResource(owner, "cust-1")).toBe(true);
  });

  it("gates inventory writes on the inventory capability, not on order-management", () => {
    expect(canManageInventory(inventory)).toBe(true);
    expect(canManageInventory(manager)).toBe(true);
    expect(canManageInventory(admin)).toBe(true);
    expect(canManageInventory(orders)).toBe(false);
    expect(canManageInventory(owner)).toBe(false);
    expect(hasCapability(owner, "manage_inventory")).toBe(false);
    expect(hasStaffRole(orders, "inventory")).toBe(false);
    expect(hasStaffRole(manager, "inventory")).toBe(true);
  });
});
