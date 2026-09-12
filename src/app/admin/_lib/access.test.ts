import { describe, expect, it } from "vitest";
import { customerPrincipal, staffPrincipal } from "@/modules/identity";
import { adminHomePath, canAccessAdmin, visibleAdminNav } from "./access";

describe("admin access", () => {
  const admin = staffPrincipal("s1", ["admin"]);
  const inventory = staffPrincipal("s2", ["inventory"]);
  const orders = staffPrincipal("s3", ["order_management"]);
  const customer = customerPrincipal("c1");

  it("lets every staff job that has a console surface in, and keeps customers out", () => {
    expect(canAccessAdmin(admin)).toBe(true);
    expect(canAccessAdmin(inventory)).toBe(true);
    expect(canAccessAdmin(orders)).toBe(true);
    expect(canAccessAdmin(customer)).toBe(false);
    expect(adminHomePath(inventory)).toBe("/admin/inventory");
    expect(adminHomePath(orders)).toBe("/admin/orders");
  });

  it("shows only the nav items the principal can use", () => {
    expect(visibleAdminNav(inventory).map((item) => item.href)).toEqual([
      "/admin/inventory",
    ]);
    expect(visibleAdminNav(orders).map((item) => item.href)).toEqual([
      "/admin/orders",
      "/admin/deliveries",
    ]);
    expect(visibleAdminNav(admin).map((item) => item.href)).toEqual([
      "/admin/products",
      "/admin/products/new",
      "/admin/orders",
      "/admin/deliveries",
      "/admin/inventory",
    ]);
  });
});
