import { describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "@/modules/identity";
import { createMemoryCatalogRepository } from "../infrastructure/memory-catalog-repository";
import type { ProductWriteInput } from "../domain/product";
import { createCatalogAdminServices } from "./admin-services";
import { createCatalogServices } from "./services";

const now = new Date("2026-09-12T12:00:00.000Z");
const manager = staffPrincipal("staff-1", ["manager"]);
const inventory = staffPrincipal("staff-2", ["inventory"]);
const customer = customerPrincipal("cust-1");

function writeInput(overrides: Partial<ProductWriteInput> = {}): ProductWriteInput {
  return {
    slug: "fx-3-disc",
    name: "FX 3 Disc",
    description: "городский гибрид",
    brandSlug: "trek",
    categorySlug: "city",
    bicycleType: "CITY",
    frameMaterial: "алюминий",
    groupset: "Shimano Acera",
    brakeType: "дисковые",
    modelYear: 2026,
    warrantyMonths: 12,
    warrantyText: null,
    variants: [
      {
        sku: "FX-M",
        frameSize: "M",
        wheelSize: "28",
        color: "синий",
        listPriceMinor: 219900,
        isActive: true,
      },
    ],
    ...overrides,
  };
}

function repos() {
  const catalog = createMemoryCatalogRepository({
    products: [],
    categories: [
      { slug: "bikes", name: "Велосипеды", parentSlug: null, sortOrder: 0 },
      { slug: "city", name: "Городские", parentSlug: "bikes", sortOrder: 1 },
    ],
    brands: [{ slug: "trek", name: "Trek" }],
  });
  const admin = createCatalogAdminServices({
    catalog,
    clock: { now: () => now },
  });
  const storefront = createCatalogServices({
    catalog,
    clock: { now: () => now },
  });
  return { admin, storefront };
}

describe("catalog admin services", () => {
  it("creates a draft that the public storefront cannot see", async () => {
    const { admin, storefront } = repos();
    const created = await admin.createProduct(manager, writeInput());
    expect(created.status).toBe("DRAFT");
    expect(created.publishedAt).toBeNull();

    const listed = await storefront.listPublishedProducts({
      page: 1,
      pageSize: 20,
      sort: { field: "name", direction: "asc" },
      filters: {},
    });
    expect(listed.items).toEqual([]);
    await expect(storefront.getProductBySlug("fx-3-disc")).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const staffView = await admin.getProduct(manager, created.id);
    expect(staffView.name).toBe("FX 3 Disc");
  });

  it("publishes only after required fields are valid, then unpublishes again", async () => {
    const { admin, storefront } = repos();
    const created = await admin.createProduct(manager, writeInput());
    const published = await admin.publish(manager, created.id);
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).toEqual(now);
    expect((await storefront.getProductBySlug("fx-3-disc")).name).toBe("FX 3 Disc");

    await admin.unpublish(manager, created.id);
    await expect(storefront.getProductBySlug("fx-3-disc")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect((await admin.getProduct(manager, created.id)).status).toBe("DRAFT");
  });

  it("rejects duplicate SKUs and size/color/wheel combinations", async () => {
    const { admin } = repos();
    await admin.createProduct(manager, writeInput());
    await expect(
      admin.createProduct(
        manager,
        writeInput({
          slug: "fx-3-disc-2",
          variants: [
            {
              sku: "FX-M",
              frameSize: "S",
              wheelSize: "28",
              color: "чёрный",
              listPriceMinor: 219900,
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({
      code: "conflict",
      context: { reason: "variant_sku_duplicate" },
    });

    await expect(
      admin.createProduct(
        manager,
        writeInput({
          slug: "fx-combo",
          variants: [
            {
              sku: "FX-A",
              frameSize: "M",
              wheelSize: "28",
              color: "синий",
              listPriceMinor: 219900,
            },
            {
              sku: "FX-B",
              frameSize: "M",
              wheelSize: "28",
              color: "синий",
              listPriceMinor: 229900,
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({
      code: "validation_failed",
      context: { reason: "variant_combination_duplicate" },
    });
  });

  it("rejects incomplete writes and unauthorized callers", async () => {
    const { admin } = repos();
    await expect(
      admin.createProduct(manager, writeInput({ name: "" })),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(admin.createProduct(customer, writeInput())).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(admin.createProduct(inventory, writeInput())).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
