import type { PrismaClient } from "@/lib/db";
import type { OrderRepository } from "./ports";

export async function createPrismaOrderRepository(
  client?: PrismaClient,
): Promise<OrderRepository> {
  const { createPrismaOrderRepository: create } = await import(
    "../infrastructure/prisma-order-repository"
  );
  return create(client);
}
