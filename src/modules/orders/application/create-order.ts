import type { OrderRepository } from "./ports";

export async function createPrismaOrderRepository(): Promise<OrderRepository> {
  const { createPrismaOrderRepository: create } = await import(
    "../infrastructure/prisma-order-repository"
  );
  return create();
}
