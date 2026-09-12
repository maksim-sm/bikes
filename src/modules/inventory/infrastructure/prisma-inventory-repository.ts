import { prisma } from "@/lib/db";
import type { InventoryRepository } from "../application/ports";

/**
 * Inventory-owned queries only. Catalog listing asks for in-stock variant ids
 * instead of joining `inventory_items` from the catalog repository.
 */
export function createPrismaInventoryAvailability(): Pick<
  InventoryRepository,
  "listInStockVariantIds" | "listAvailabilityByVariantIds"
> {
  return {
    async listInStockVariantIds() {
      const rows = await prisma.inventoryItem.findMany({
        where: { available: { gt: 0 } },
        select: { variantId: true },
      });
      return rows.map((row) => row.variantId);
    },
    async listAvailabilityByVariantIds(variantIds) {
      if (variantIds.length === 0) {
        return [];
      }
      const rows = await prisma.inventoryItem.findMany({
        where: { variantId: { in: [...variantIds] } },
        select: { variantId: true, available: true },
      });
      return rows.map((row) => ({ variantId: row.variantId, available: row.available }));
    },
  };
}
