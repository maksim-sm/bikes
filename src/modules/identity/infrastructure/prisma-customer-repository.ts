import { prisma, type PrismaClient } from "@/lib/db";
import type { Address, CustomerProfile } from "../domain/customer";
import type { CustomerRepository } from "../application/ports";

function toProfile(row: {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}): CustomerProfile {
  return {
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
  };
}

function toAddress(row: {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  countryCode: string;
  region: string;
  city: string;
  street: string;
  postalCode: string;
  isDefault: boolean;
}): Address {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    recipientName: row.recipientName,
    phone: row.phone,
    countryCode: row.countryCode,
    region: row.region,
    city: row.city,
    street: row.street,
    postalCode: row.postalCode,
    isDefault: row.isDefault,
  };
}

export function createPrismaCustomerRepository(
  client: PrismaClient = prisma,
): CustomerRepository {
  return {
    async getProfile(userId) {
      const row = await client.customerProfile.findUnique({ where: { userId } });
      return row ? toProfile(row) : null;
    },

    async saveProfile(profile) {
      const row = await client.customerProfile.upsert({
        where: { userId: profile.userId },
        create: {
          userId: profile.userId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
        },
        update: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
        },
      });
      return toProfile(row);
    },

    async listAddresses(userId) {
      const rows = await client.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      return rows.map(toAddress);
    },

    async saveAddresses(userId, addresses) {
      await client.$transaction(async (tx) => {
        await tx.address.deleteMany({ where: { userId } });
        if (addresses.length === 0) {
          return;
        }
        await tx.address.createMany({
          data: addresses.map((address) => ({
            id: address.id,
            userId,
            label: address.label,
            recipientName: address.recipientName,
            phone: address.phone,
            countryCode: address.countryCode,
            region: address.region,
            city: address.city,
            street: address.street,
            postalCode: address.postalCode,
            isDefault: address.isDefault,
          })),
        });
      });
      return addresses;
    },
  };
}
