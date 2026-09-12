import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/db";
import { descendantCategorySlugs } from "../application/list-match";
import type { CatalogListQuery } from "../application/list-query";
import type { CatalogListResult, CatalogRepository } from "../application/ports";
import type {
  BicycleType,
  Brand,
  Category,
  Product,
  ProductVariant,
} from "../domain/product";

type ProductRow = Prisma.ProductGetPayload<{
  include: { brand: true; category: true; variants: true };
}>;

const productInclude = {
  brand: true,
  category: true,
  variants: { where: { isActive: true } },
} as const;

function toVariant(row: ProductRow["variants"][number]): ProductVariant {
  return {
    id: row.id,
    productId: row.productId,
    sku: row.sku,
    frameSize: row.frameSize,
    wheelSize: row.wheelSize,
    color: row.color,
    listPriceMinor: row.listPriceMinor,
    currency: "BYN",
    isActive: row.isActive,
  };
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    publishedAt: row.publishedAt,
    brandName: row.brand.name,
    brandSlug: row.brand.slug,
    categorySlug: row.category.slug,
    bicycleType: row.bicycleType as BicycleType,
    frameMaterial: row.frameMaterial,
    groupset: row.groupset,
    brakeType: row.brakeType,
    variants: row.variants.map(toVariant),
  };
}

function publishedWhere(now: Date): Prisma.ProductWhereInput {
  return {
    status: "PUBLISHED",
    publishedAt: { not: null, lte: now },
  };
}

async function categoryIdFilter(
  categorySlug: string | undefined,
): Promise<Prisma.ProductWhereInput | { empty: true } | Record<string, never>> {
  if (!categorySlug) {
    return {};
  }
  const rows = await prisma.category.findMany({
    select: { id: true, slug: true, parentId: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const categories: Category[] = rows.map((row) => ({
    slug: row.slug,
    name: row.slug,
    parentSlug: row.parentId ? (byId.get(row.parentId)?.slug ?? null) : null,
    sortOrder: 0,
  }));
  const slugs = descendantCategorySlugs(categories, categorySlug);
  if (slugs === null) {
    return { empty: true };
  }
  const ids = rows.filter((row) => slugs.includes(row.slug)).map((row) => row.id);
  return { categoryId: { in: ids } };
}

function variantWhere(query: CatalogListQuery): Prisma.ProductVariantWhereInput {
  const where: Prisma.ProductVariantWhereInput = { isActive: true };
  if (query.filters.frameSize) {
    where.frameSize = query.filters.frameSize;
  }
  if (query.filters.wheelSize) {
    where.wheelSize = query.filters.wheelSize;
  }
  if (
    query.filters.minPriceMinor !== undefined ||
    query.filters.maxPriceMinor !== undefined
  ) {
    where.listPriceMinor = {
      ...(query.filters.minPriceMinor !== undefined
        ? { gte: query.filters.minPriceMinor }
        : {}),
      ...(query.filters.maxPriceMinor !== undefined
        ? { lte: query.filters.maxPriceMinor }
        : {}),
    };
  }
  const ids = query.availableVariantIds ?? [];
  if (query.filters.available === true) {
    where.id = { in: ids };
  } else if (query.filters.available === false && ids.length > 0) {
    where.id = { notIn: ids };
  }
  return where;
}

async function buildWhere(
  query: CatalogListQuery,
): Promise<Prisma.ProductWhereInput | null> {
  const category = await categoryIdFilter(query.filters.categorySlug);
  if ("empty" in category) {
    return null;
  }
  const filters = query.filters;
  const where: Prisma.ProductWhereInput = {
    ...publishedWhere(query.now),
    ...category,
    variants: { some: variantWhere(query) },
  };
  if (filters.brandSlug) {
    where.brand = { slug: filters.brandSlug };
  }
  if (filters.bicycleType) {
    where.bicycleType = filters.bicycleType;
  }
  if (filters.frameMaterial) {
    where.frameMaterial = filters.frameMaterial;
  }
  if (filters.groupset) {
    where.groupset = filters.groupset;
  }
  if (filters.brakeType) {
    where.brakeType = filters.brakeType;
  }
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { brand: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }
  return where;
}

function orderBy(query: CatalogListQuery): Prisma.ProductOrderByWithRelationInput[] {
  if (query.sort.field === "name") {
    return [{ name: query.sort.direction }, { slug: "asc" }];
  }
  return [{ publishedAt: query.sort.direction }, { slug: "asc" }];
}

function orderProductsByIds(products: Product[], ids: string[]): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

async function listIdsByMinPrice(
  where: Prisma.ProductWhereInput,
  query: CatalogListQuery,
): Promise<string[]> {
  const matched = await prisma.product.findMany({
    where,
    select: { id: true },
  });
  if (matched.length === 0) {
    return [];
  }
  const direction = query.sort.direction === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM products p
    WHERE p.id IN (${Prisma.join(matched.map((row) => row.id))})
    ORDER BY (
      SELECT MIN(v.list_price_minor)
      FROM product_variants v
      WHERE v.product_id = p.id AND v.is_active
    ) ${direction},
    p.slug ASC
    LIMIT ${query.pageSize}
    OFFSET ${(query.page - 1) * query.pageSize}
  `;
  return rows.map((row) => row.id);
}

export function createPrismaCatalogRepository(): CatalogRepository {
  return {
    async findBySlug(slug) {
      const row = await prisma.product.findUnique({
        where: { slug },
        include: productInclude,
      });
      return row ? toProduct(row) : null;
    },

    async listPublished(query) {
      const where = await buildWhere(query);
      if (!where) {
        return { items: [], total: 0 };
      }
      const total = await prisma.product.count({ where });
      if (total === 0) {
        return { items: [], total: 0 };
      }
      if (query.sort.field === "price") {
        const ids = await listIdsByMinPrice(where, query);
        const priced = await prisma.product.findMany({
          where: { id: { in: ids } },
          include: productInclude,
        });
        return { items: orderProductsByIds(priced.map(toProduct), ids), total };
      }
      const rows = await prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: orderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      return { items: rows.map(toProduct), total };
    },

    async listCategories() {
      const rows = await prisma.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { parent: { select: { slug: true } } },
      });
      return rows.map(
        (row): Category => ({
          slug: row.slug,
          name: row.name,
          parentSlug: row.parent?.slug ?? null,
          sortOrder: row.sortOrder,
        }),
      );
    },

    async listBrands() {
      const rows = await prisma.brand.findMany({ orderBy: { name: "asc" } });
      return rows.map((row): Brand => ({ slug: row.slug, name: row.name }));
    },
  };
}
