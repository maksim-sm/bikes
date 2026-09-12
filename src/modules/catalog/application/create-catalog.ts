import type { CatalogRepository } from "./ports";

export async function createPrismaCatalogRepository(): Promise<CatalogRepository> {
  const { createPrismaCatalogRepository: create } = await import(
    "../infrastructure/prisma-catalog-repository"
  );
  return create();
}
