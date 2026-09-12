import type { Address, CustomerProfile } from "../domain/customer";
import type { Wishlist } from "../domain/wishlist";

export interface CustomerRepository {
  getProfile(userId: string): Promise<CustomerProfile | null>;
  saveProfile(profile: CustomerProfile): Promise<CustomerProfile>;
  listAddresses(userId: string): Promise<Address[]>;
  saveAddresses(userId: string, addresses: Address[]): Promise<Address[]>;
}

export interface WishlistRepository {
  getByUser(userId: string): Promise<Wishlist | null>;
  create(userId: string): Promise<Wishlist>;
  save(wishlist: Wishlist): Promise<Wishlist>;
}

export interface WishlistCatalogProduct {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  listed: boolean;
  listPriceMinor: number | null;
  variantIds: string[];
  image: { src: string; alt: string } | null;
}

export interface WishlistCatalog {
  getProduct(productId: string): Promise<WishlistCatalogProduct | null>;
}

export interface WishlistStock {
  anyInStock(variantIds: readonly string[]): Promise<boolean>;
}
