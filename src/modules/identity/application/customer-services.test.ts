import { describe, expect, it } from "vitest";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "../domain/principal";
import {
  prepareNewAddress,
  withSingleDefault,
  type Address,
  type CustomerProfile,
} from "../domain/customer";
import type { CustomerRepository } from "./ports";
import { createCustomerServices } from "./customer-services";

function memoryCustomers(): CustomerRepository {
  const profiles = new Map<string, CustomerProfile>();
  const addresses = new Map<string, Address[]>();
  return {
    async getProfile(userId) {
      return profiles.get(userId) ?? null;
    },
    async saveProfile(next) {
      profiles.set(next.userId, next);
      return next;
    },
    async listAddresses(userId) {
      return addresses.get(userId) ?? [];
    },
    async saveAddresses(userId, next) {
      addresses.set(userId, next);
      return next;
    },
  };
}

describe("customer address rules", () => {
  it("keeps exactly one default", () => {
    const first: Address = {
      id: "a1",
      userId: "u1",
      label: "дом",
      recipientName: "Иван",
      phone: "+37529",
      countryCode: "BY",
      region: "Минск",
      city: "Минск",
      street: "1",
      postalCode: "220000",
      isDefault: true,
    };
    const added = prepareNewAddress([first], { ...first, id: "a2", isDefault: true });
    expect(added.filter((row) => row.isDefault).map((row) => row.id)).toEqual(["a2"]);
    expect(withSingleDefault(added, "a1").find((row) => row.isDefault)?.id).toBe("a1");
  });
});

describe("customer services", () => {
  it("updates a profile and stores an address", async () => {
    const customers = createCustomerServices({ customers: memoryCustomers() });
    const self = customerPrincipal("u1");
    const profile = await customers.updateProfile(self, "u1", {
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+37529",
    });
    expect(profile.firstName).toBe("Иван");
    const listed = await customers.addAddress(self, "u1", {
      label: "дом",
      recipientName: "Иван",
      phone: "+37529",
      countryCode: "BY",
      region: "Минск",
      city: "Минск",
      street: "1",
      postalCode: "220000",
      isDefault: false,
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.isDefault).toBe(true);
    await expect(
      customers.updateProfile(self, "u1", {
        firstName: " ",
        lastName: "Иванов",
        phone: null,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses another customer reading a profile or address", async () => {
    const customers = createCustomerServices({ customers: memoryCustomers() });
    await customers.updateProfile(customerPrincipal("u1"), "u1", {
      firstName: "Иван",
      lastName: "Иванов",
      phone: null,
    });
    await expect(
      customers.getProfile(customerPrincipal("u2"), "u1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      customers.listAddresses(customerPrincipal("u2"), "u1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      customers.getProfile(staffPrincipal("inv", ["inventory"]), "u1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    const asManager = await customers.getProfile(
      staffPrincipal("mgr", ["manager"]),
      "u1",
    );
    expect(asManager.firstName).toBe("Иван");
  });
});
