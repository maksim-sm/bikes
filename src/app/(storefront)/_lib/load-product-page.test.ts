import { afterEach, describe, expect, it } from "vitest";
import {
  createDemoCatalogInventory,
  createDemoCatalogRepository,
} from "@/modules/catalog";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  getCartServices,
  resetRepositories,
  setCatalogInventory,
  setCatalogRepository,
} from "@/app/api/_lib/compose";
import { loadProductPage } from "./load-product-page";

afterEach(() => {
  resetRepositories();
});

describe("loadProductPage", () => {
  it("loads images, warranty, and per-variant availability from inventory", async () => {
    setCatalogRepository(createDemoCatalogRepository());
    setCatalogInventory(createDemoCatalogInventory());

    const page = await loadProductPage("emonda");

    expect(page.name).toBe("Émonda SL 5");
    expect(page.modelYear).toBe(2026);
    expect(page.warrantyMonths).toBe(24);
    expect(page.images).toHaveLength(2);
    expect(page.images[0]?.src).toBe("/api/media/demo/emonda-front");
    const black = page.variants.find((variant) => variant.id === "v-emonda-m-black");
    expect(black?.available).toBe(4);
    expect(black?.barcode).toBe("4810123450001");
    expect(black?.images[0]?.src).toBe("/api/media/demo/emonda-m-black");
    expect(
      page.variants.find((variant) => variant.id === "v-emonda-m-red")?.available,
    ).toBe(0);
    expect(page.quotes[0]).toMatchObject({
      methodCode: "minsk-courier",
      costMinor: 2500,
      estimatedDays: 1,
      estimatedText: "1 рабочий день",
    });
  });

  it("does not load a draft product on the public page", async () => {
    setCatalogRepository(createDemoCatalogRepository());
    setCatalogInventory(createDemoCatalogInventory());
    await expect(loadProductPage("fx-3-disc")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects adding an out-of-stock variant to the cart", async () => {
    setCatalogRepository(createDemoCatalogRepository());
    setCatalogInventory(createDemoCatalogInventory());
    const cart = await getCartServices();
    const actor = { kind: "guest" as const, guestToken: "guest-test-1" };

    await expect(cart.addItem(actor, "v-emonda-m-red", 1)).rejects.toBeInstanceOf(
      ConflictError,
    );
    const saved = await cart.addItem(actor, "v-emonda-m-black", 1);
    expect(saved.items).toEqual([{ variantId: "v-emonda-m-black", quantity: 1 }]);
  });
});
