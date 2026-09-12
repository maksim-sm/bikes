import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  assertProfileNames,
  prepareNewAddress,
  withSingleDefault,
  type Address,
  type CustomerProfile,
} from "../domain/customer";
import type { Principal } from "../domain/principal";
import {
  assertCanReadCustomerResource,
  assertCanWriteCustomerResource,
} from "./authorization";
import type { CustomerRepository } from "./ports";

export interface CustomerServices {
  getProfile(principal: Principal, userId: string): Promise<CustomerProfile>;
  updateProfile(
    principal: Principal,
    userId: string,
    input: { firstName: string; lastName: string; phone: string | null },
  ): Promise<CustomerProfile>;
  listAddresses(principal: Principal, userId: string): Promise<Address[]>;
  addAddress(
    principal: Principal,
    userId: string,
    input: Omit<Address, "id" | "userId">,
  ): Promise<Address[]>;
  setDefaultAddress(
    principal: Principal,
    userId: string,
    addressId: string,
  ): Promise<Address[]>;
}

export function createCustomerServices(deps: {
  customers: CustomerRepository;
}): CustomerServices {
  return {
    async getProfile(principal, userId) {
      assertCanReadCustomerResource(principal, userId);
      const profile = await deps.customers.getProfile(userId);
      if (!profile) {
        throw new NotFoundError("customer profile not found", { userId });
      }
      return profile;
    },

    async updateProfile(principal, userId, input) {
      assertCanWriteCustomerResource(principal, userId);
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

    async listAddresses(principal, userId) {
      assertCanReadCustomerResource(principal, userId);
      return deps.customers.listAddresses(userId);
    },

    async addAddress(principal, userId, input) {
      assertCanWriteCustomerResource(principal, userId);
      const current = await deps.customers.listAddresses(userId);
      const created: Address = {
        ...input,
        id: crypto.randomUUID(),
        userId,
      };
      return deps.customers.saveAddresses(userId, prepareNewAddress(current, created));
    },

    async setDefaultAddress(principal, userId, addressId) {
      assertCanWriteCustomerResource(principal, userId);
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
