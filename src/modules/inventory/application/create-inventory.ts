export async function createPrismaCatalogInventory(): Promise<{
  listInStockVariantIds(): Promise<string[]>;
}> {
  const { createPrismaInventoryAvailability } = await import(
    "../infrastructure/prisma-inventory-repository"
  );
  return createPrismaInventoryAvailability();
}
