import { Prisma } from "../../../generated/prisma/client";
import { ConflictError } from "@/lib/errors";
import { prisma, type PrismaClient } from "@/lib/db";
import type { Wishlist } from "../domain/wishlist";
import type { WishlistRepository } from "../application/ports";

function toWishlist(row: {
  id: string;
  userId: string;
  items: Array<{ productId: string; savedPriceMinor: number | null }>;
}): Wishlist {
  return {
    id: row.id,
    userId: row.userId,
    items: row.items.map((item) => ({
      productId: item.productId,
      savedPriceMinor: item.savedPriceMinor,
    })),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const itemOrder = { createdAt: "asc" as const };

export function createPrismaWishlistRepository(
  client: PrismaClient = prisma,
): WishlistRepository {
  return {
    async getByUser(userId) {
      const row = await client.wishlist.findUnique({
        where: { userId },
        include: { items: { orderBy: itemOrder } },
      });
      return row ? toWishlist(row) : null;
    },

    async create(userId) {
      try {
        const row = await client.wishlist.create({
          data: { userId },
          include: { items: { orderBy: itemOrder } },
        });
        return toWishlist(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          const existing = await client.wishlist.findUnique({
            where: { userId },
            include: { items: { orderBy: itemOrder } },
          });
          if (existing) {
            return toWishlist(existing);
          }
        }
        throw error;
      }
    },

    async save(wishlist) {
      try {
        await client.$transaction(async (tx) => {
          await tx.wishlist.update({
            where: { id: wishlist.id },
            data: { updatedAt: new Date() },
          });
          await tx.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
          if (wishlist.items.length === 0) {
            return;
          }
          await tx.wishlistItem.createMany({
            data: wishlist.items.map((item) => ({
              wishlistId: wishlist.id,
              productId: item.productId,
              savedPriceMinor: item.savedPriceMinor,
            })),
          });
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictError("product is already on the wishlist");
        }
        throw error;
      }
      return wishlist;
    },
  };
}
