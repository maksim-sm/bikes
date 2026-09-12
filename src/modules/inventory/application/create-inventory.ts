export async function createPrismaCatalogInventory(): Promise<{
  listInStockVariantIds(): Promise<string[]>;
  listAvailabilityByVariantIds(
    variantIds: readonly string[],
  ): Promise<Array<{ variantId: string; available: number }>>;
}> {
  const { createPrismaInventoryAvailability } = await import(
    "../infrastructure/prisma-inventory-repository"
  );
  return createPrismaInventoryAvailability();
}
