import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  assertProfileNames,
  prepareNewAddress,
  withSingleDefault,
  type Address,
  type CustomerProfile,
} from "../domain/customer";
import type { CustomerRepository } from "./ports";

export interface CustomerServices {
  getProfile(userId: string): Promise<CustomerProfile>;
  updateProfile(
    userId: string,
    input: { firstName: string; lastName: string; phone: string | null },
  ): Promise<CustomerProfile>;
  listAddresses(userId: string): Promise<Address[]>;
  addAddress(userId: string, input: Omit<Address, "id" | "userId">): Promise<Address[]>;
  setDefaultAddress(userId: string, addressId: string): Promise<Address[]>;
}

export function createCustomerServices(deps: {
  customers: CustomerRepository;
}): CustomerServices {
  return {
    async getProfile(userId) {
      const profile = await deps.customers.getProfile(userId);
      if (!profile) {
        throw new NotFoundError("customer profile not found", { userId });
      }
      return profile;
    },

    async updateProfile(userId, input) {
      try {
        assertProfileNames(input.firstName, input.lastName);
      } catch {
        throw new ValidationError("first and last name are required");
      }
      return deps.customers.saveProfile({
        userId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone,
      });
    },

    async listAddresses(userId) {
      return deps.customers.listAddresses(userId);
    },

    async addAddress(userId, input) {
      const current = await deps.customers.listAddresses(userId);
      const created: Address = {
        ...input,
        id: `addr-${current.length + 1}`,
        userId,
      };
      return deps.customers.saveAddresses(userId, prepareNewAddress(current, created));
    },

    async setDefaultAddress(userId, addressId) {
      const current = await deps.customers.listAddresses(userId);
      try {
        return deps.customers.saveAddresses(
          userId,
          withSingleDefault(current, addressId),
        );
      } catch {
        throw new NotFoundError("address not found", { addressId });
      }
    },
  };
}
