import type { PrismaClient } from "@/lib/db";
import type { CartRepository } from "./ports";

export async function createPrismaCartRepository(
  client?: PrismaClient,
): Promise<CartRepository> {
  const { createPrismaCartRepository: create } = await import(
    "../infrastructure/prisma-cart-repository"
  );
  return create(client);
}
