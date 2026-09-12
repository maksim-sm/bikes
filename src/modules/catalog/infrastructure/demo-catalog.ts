import { createMemoryCatalogRepository } from "./memory-catalog-repository";
import type { Product } from "../domain/product";

const now = new Date("2026-01-01T00:00:00.000Z");

export const demoEmonda: Product = {
  id: "p-emonda",
  slug: "emonda",
  name: "Émonda SL 5",
  description:
    "Лёгкий шоссейный велосипед для тренировок и любительских стартов. Карбоновая рама, группа Shimano 105 и дисковые тормоза.",
  status: "PUBLISHED",
  publishedAt: now,
  brandName: "Trek",
  brandSlug: "trek",
  categorySlug: "road",
  bicycleType: "ROAD",
  frameMaterial: "карбон",
  groupset: "Shimano 105",
  brakeType: "дисковые",
  modelYear: 2026,
  warrantyMonths: 24,
  warrantyText: "2 года на раму и вилку при бытовом использовании",
  images: [
    {
      key: "demo/emonda-front",
      alt: "Trek Émonda SL 5, вид спереди",
      role: "PRIMARY",
      sortOrder: 0,
    },
    {
      key: "demo/emonda-side",
      alt: "Trek Émonda SL 5, вид сбоку",
      role: "GALLERY",
      sortOrder: 1,
    },
  ],
  variants: [
    {
      id: "v-emonda-m-black",
      productId: "p-emonda",
      sku: "EM-M-BLK",
      frameSize: "M",
      wheelSize: "28",
      color: "чёрный",
      listPriceMinor: 349900,
      currency: "BYN",
      isActive: true,
    },
    {
      id: "v-emonda-l-black",
      productId: "p-emonda",
      sku: "EM-L-BLK",
      frameSize: "L",
      wheelSize: "28",
      color: "чёрный",
      listPriceMinor: 349900,
      currency: "BYN",
      isActive: true,
    },
    {
      id: "v-emonda-m-red",
      productId: "p-emonda",
      sku: "EM-M-RED",
      frameSize: "M",
      wheelSize: "28",
      color: "красный",
      listPriceMinor: 359900,
      currency: "BYN",
      isActive: true,
    },
    {
      id: "v-emonda-l-red",
      productId: "p-emonda",
      sku: "EM-L-RED",
      frameSize: "L",
      wheelSize: "28",
      color: "красный",
      listPriceMinor: 359900,
      currency: "BYN",
      isActive: true,
    },
  ],
};

export const demoDraftFx: Product = {
  id: "p-fx-draft",
  slug: "fx-3-disc",
  name: "FX 3 Disc",
  description: "Городской гибрид. Черновик — не должен появляться на витрине.",
  status: "DRAFT",
  publishedAt: null,
  brandName: "Trek",
  brandSlug: "trek",
  categorySlug: "city",
  bicycleType: "CITY",
  frameMaterial: "алюминий",
  groupset: "Shimano Acera",
  brakeType: "дисковые",
  modelYear: 2026,
  warrantyMonths: 12,
  warrantyText: null,
  images: [],
  variants: [
    {
      id: "v-fx-m-blue",
      productId: "p-fx-draft",
      sku: "FX-M-BLU",
      frameSize: "M",
      wheelSize: "28",
      color: "синий",
      listPriceMinor: 219900,
      currency: "BYN",
      isActive: true,
    },
  ],
};

export function createDemoCatalogRepository() {
  return createMemoryCatalogRepository({
    products: [demoEmonda, demoDraftFx],
    categories: [
      { slug: "bikes", name: "Велосипеды", parentSlug: null, sortOrder: 0 },
      { slug: "road", name: "Шоссе", parentSlug: "bikes", sortOrder: 1 },
      { slug: "city", name: "Городские", parentSlug: "bikes", sortOrder: 2 },
    ],
    brands: [{ slug: "trek", name: "Trek" }],
  });
}

export function createDemoCatalogInventory() {
  const stock = new Map<string, number>([
    ["v-emonda-m-black", 4],
    ["v-emonda-l-black", 2],
    ["v-emonda-m-red", 0],
    ["v-emonda-l-red", 1],
  ]);
  return {
    async listInStockVariantIds() {
      return [...stock.entries()]
        .filter(([, available]) => available > 0)
        .map(([variantId]) => variantId);
    },
    async listAvailabilityByVariantIds(variantIds: readonly string[]) {
      return variantIds.map((variantId) => ({
        variantId,
        available: stock.get(variantId) ?? 0,
      }));
    },
  };
}
