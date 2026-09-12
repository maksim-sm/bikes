import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import {
  prepareNewAddress,
  withSingleDefault,
  type Address,
  type CustomerProfile,
} from "../domain/customer";
import type { CustomerRepository } from "./ports";
import { createCustomerServices } from "./customer-services";

function memoryCustomers(): CustomerRepository {
  let profile: CustomerProfile | null = null;
  let addresses: Address[] = [];
  return {
    async getProfile() {
      return profile;
    },
    async saveProfile(next) {
      profile = next;
      return next;
    },
    async listAddresses() {
      return addresses;
    },
    async saveAddresses(_userId, next) {
      addresses = next;
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
    const profile = await customers.updateProfile("u1", {
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+37529",
    });
    expect(profile.firstName).toBe("Иван");
    const listed = await customers.addAddress("u1", {
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
      customers.updateProfile("u1", { firstName: " ", lastName: "Иванов", phone: null }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
