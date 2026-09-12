import type { Address, CustomerProfile } from "../domain/customer";
import type { Wishlist } from "../domain/wishlist";
import type { CustomerRepository, WishlistRepository } from "../application/ports";

export function createMemoryCustomerRepository(): CustomerRepository {
  const profiles = new Map<string, CustomerProfile>();
  const addresses = new Map<string, Address[]>();
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
      const wishlist: Wishlist = { id: `w-${userId}`, userId, productIds: [] };
      rows.set(userId, wishlist);
      return wishlist;
    },
    async save(wishlist) {
      rows.set(wishlist.userId, wishlist);
      return wishlist;
    },
  };
}
