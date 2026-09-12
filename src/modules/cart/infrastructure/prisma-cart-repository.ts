import { NotFoundError } from "@/lib/errors";
import { prisma, type PrismaClient } from "@/lib/db";
import type { Cart } from "../domain/cart";
import type { CartRepository } from "../application/ports";

type CartRow = {
  id: string;
  userId: string | null;
  guestToken: string | null;
  items: Array<{ productVariantId: string; quantity: number }>;
};

function toCart(row: CartRow): Cart {
  return {
    id: row.id,
    userId: row.userId,
    guestToken: row.guestToken,
    items: row.items.map((item) => ({
      variantId: item.productVariantId,
      quantity: item.quantity,
    })),
  };
}

const itemOrder = { createdAt: "asc" as const };

export function createPrismaCartRepository(
  client: PrismaClient = prisma,
): CartRepository {
  async function loadById(id: string): Promise<Cart> {
    const row = await client.cart.findUnique({
      where: { id },
      include: { items: { orderBy: itemOrder } },
    });
    if (!row) {
      throw new NotFoundError("cart not found", { cartId: id });
    }
    return toCart(row);
  }

  return {
    async findByActor(actor) {
      const row =
        actor.kind === "guest"
          ? await client.cart.findUnique({
              where: { guestToken: actor.guestToken },
              include: { items: { orderBy: itemOrder } },
            })
          : await client.cart.findFirst({
              where: { userId: actor.userId },
              include: { items: { orderBy: itemOrder } },
            });
      return row ? toCart(row) : null;
    },

    async create(actor) {
      const row = await client.cart.create({
        data:
          actor.kind === "guest"
            ? { guestToken: actor.guestToken }
            : { userId: actor.userId },
        include: { items: { orderBy: itemOrder } },
      });
      return toCart(row);
    },

    async save(cart) {
      await client.$transaction(async (tx) => {
        await tx.cart.update({
          where: { id: cart.id },
          data: { userId: cart.userId, guestToken: cart.guestToken },
        });
        const existing = await tx.cartItem.findMany({ where: { cartId: cart.id } });
        const wanted = new Set(cart.items.map((item) => item.variantId));
        const stale = existing.filter((row) => !wanted.has(row.productVariantId));
        if (stale.length > 0) {
          await tx.cartItem.deleteMany({
            where: { id: { in: stale.map((row) => row.id) } },
          });
        }
        for (const item of cart.items) {
          await tx.cartItem.upsert({
            where: {
              cartId_productVariantId: {
                cartId: cart.id,
                productVariantId: item.variantId,
              },
            },
            create: {
              cartId: cart.id,
              productVariantId: item.variantId,
              quantity: item.quantity,
            },
            update: { quantity: item.quantity },
          });
        }
      });
      return loadById(cart.id);
    },

    async delete(cart) {
      await client.cart.deleteMany({ where: { id: cart.id } });
    },

    async transferToCustomer(cartId, userId) {
      await client.cart.update({
        where: { id: cartId },
        data: { userId, guestToken: null },
      });
      return loadById(cartId);
    },
  };
}
