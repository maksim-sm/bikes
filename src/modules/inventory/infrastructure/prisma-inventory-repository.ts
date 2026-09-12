import { prisma } from "@/lib/db";
import type { InventoryRepository } from "../application/ports";

/**
 * Inventory-owned queries only. Catalog listing asks for in-stock variant ids
 * instead of joining `inventory_items` from the catalog repository.
 */
export function createPrismaInventoryAvailability(): Pick<
  InventoryRepository,
  "listInStockVariantIds"
> {
  return {
    async listInStockVariantIds() {
      const rows = await prisma.inventoryItem.findMany({
        where: { available: { gt: 0 } },
        select: { variantId: true },
      });
      return rows.map((row) => row.variantId);
    },
  };
}
