import type { InventoryRepository } from "./ports";
import type { InventoryServices } from "./services";
import { createInventoryServices } from "./services";

export async function createPrismaInventoryRepository(): Promise<InventoryRepository> {
  const { createPrismaInventoryRepository: create } = await import(
    "../infrastructure/prisma-inventory-repository"
  );
  return create();
}

export async function createPrismaCatalogInventory(): Promise<{
  listInStockVariantIds(): Promise<string[]>;
  listAvailabilityByVariantIds(
    variantIds: readonly string[],
  ): Promise<Array<{ variantId: string; available: number }>>;
}> {
  return createPrismaInventoryRepository();
}

export async function createPrismaInventoryServices(): Promise<InventoryServices> {
  return createInventoryServices({
    inventory: await createPrismaInventoryRepository(),
    clock: { now: () => new Date() },
  });
}
