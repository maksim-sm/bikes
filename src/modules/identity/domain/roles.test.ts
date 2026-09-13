import { describe, expect, it } from "vitest";
import { capabilitiesForRoles, isStaffRole, parseStaffRoles } from "./roles";

describe("staff role parsing", () => {
  it("drops unknown titles and de-duplicates known ones", () => {
    expect(parseStaffRoles(undefined)).toEqual([]);
    expect(parseStaffRoles("")).toEqual([]);
    expect(parseStaffRoles("admin,hacker,inventory,admin")).toEqual([
      "admin",
      "inventory",
    ]);
    expect(parseStaffRoles(" inventory , order_management ")).toEqual([
      "inventory",
      "order_management",
    ]);
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("hacker")).toBe(false);
  });

  it("does not grant catalog or customer-read to a floor inventory title", () => {
    expect([...capabilitiesForRoles(["inventory"])]).toEqual(["manage_inventory"]);
    expect(capabilitiesForRoles(["order_management"]).has("manage_orders")).toBe(true);
    expect(capabilitiesForRoles(["order_management"]).has("read_any_customer")).toBe(
      false,
    );
  });
});
