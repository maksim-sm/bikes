import type { Address, CustomerProfile } from "../domain/customer";
import type { Wishlist } from "../domain/wishlist";
import type { CustomerRepository, WishlistRepository } from "../application/ports";

export function createMemoryCustomerRepository(seed?: {
  profiles?: readonly CustomerProfile[];
  addresses?: readonly Address[];
}): CustomerRepository {
  const profiles = new Map<string, CustomerProfile>(
    (seed?.profiles ?? []).map((profile) => [profile.userId, profile]),
  );
  const addresses = new Map<string, Address[]>();
  for (const address of seed?.addresses ?? []) {
    const current = addresses.get(address.userId) ?? [];
    current.push(address);
    addresses.set(address.userId, current);
  }
  return {
    async getProfile(userId) {
      return profiles.get(userId) ?? null;
    },
    async saveProfile(profile) {
      profiles.set(profile.userId, profile);
      return profile;
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

export function createMemoryWishlistRepository(): WishlistRepository {
  const rows = new Map<string, Wishlist>();
  return {
    async getByUser(userId) {
      return rows.get(userId) ?? null;
    },
    async create(userId) {
      const existing = rows.get(userId);
      if (existing) {
        return existing;
      }
      const wishlist: Wishlist = { id: `w-${userId}`, userId, items: [] };
      rows.set(userId, wishlist);
      return wishlist;
    },
    async save(wishlist) {
      rows.set(wishlist.userId, wishlist);
      return wishlist;
    },
  };
}
