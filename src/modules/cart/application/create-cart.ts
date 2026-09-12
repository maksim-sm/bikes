import type { CartRepository } from "./ports";

export async function createPrismaCartRepository(): Promise<CartRepository> {
  const { createPrismaCartRepository: create } = await import(
    "../infrastructure/prisma-cart-repository"
  );
  return create();
}
