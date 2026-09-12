import { Prisma } from "../../../generated/prisma/client";
import { ConflictError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { descendantCategorySlugs } from "../application/list-match";
import type { CatalogListQuery } from "../application/list-query";
import type { CatalogRepository } from "../application/ports";
import type {
  BicycleType,
  Brand,
  Category,
  Product,
  ProductImage,
  ProductVariant,
  VariantStatus,
} from "../domain/product";
import { escapeIlike } from "../domain/search";

const variantInclude = {
  media: { include: { media: true }, orderBy: { sortOrder: "asc" as const } },
} as const;

type VariantRow = Prisma.ProductVariantGetPayload<{ include: typeof variantInclude }>;

type ProductRow = Prisma.ProductGetPayload<{
  include: {
    brand: true;
    category: true;
    variants: { include: typeof variantInclude };
    media: { include: { media: true } };
  };
}>;

const productInclude = {
  brand: true,
  category: true,
  variants: { where: { isActive: true }, include: variantInclude },
  media: { include: { media: true }, orderBy: { sortOrder: "asc" as const } },
} as const;

const adminProductInclude = {
  brand: true,
  category: true,
  variants: { include: variantInclude },
  media: { include: { media: true }, orderBy: { sortOrder: "asc" as const } },
} as const;

function toDomainStatus(status: VariantRow["status"]): VariantStatus {
  return status === "ACTIVE" ? "active" : "inactive";
}

function toPrismaStatus(status: VariantStatus): "ACTIVE" | "INACTIVE" {
  return status === "active" ? "ACTIVE" : "INACTIVE";
}

function toImages(rows: VariantRow["media"] | ProductRow["media"]): ProductImage[] {
  return rows.map((item) => ({
    key: item.media.key,
    alt: item.alt,
    role: item.role,
    sortOrder: item.sortOrder,
  }));
}

function toVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.productId,
    sku: row.sku,
    barcode: row.barcode,
    frameSize: row.frameSize,
    wheelSize: row.wheelSize,
    color: row.color,
    listPriceMinor: row.listPriceMinor,
    currency: "BYN",
    status: toDomainStatus(row.status),
    isActive: row.isActive,
    images: toImages(row.media),
  };
}

function mapUniqueViolation(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.map(String).join(",")
      : String(error.meta?.target ?? "");
    if (target.includes("sku")) {
      throw new ConflictError("sku already exists", { reason: "variant_sku_duplicate" });
    }
    if (target.includes("barcode")) {
      throw new ConflictError("barcode already exists", {
        reason: "variant_barcode_duplicate",
      });
    }
    if (
      target.includes("frame_size") ||
      target.includes("color") ||
      target.includes("wheel_size") ||
      target.includes("size_color")
    ) {
      throw new ConflictError("variant combination already exists", {
        reason: "variant_combination_duplicate",
      });
    }
    throw new ConflictError("unique constraint failed", { target });
  }
  throw error;
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
    modelYear: row.modelYear,
    warrantyMonths: row.warrantyMonths,
    warrantyText: row.warrantyText,
    images: toImages(row.media),
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
  return where;
}

/**
 * One indexed query: GIN tsvector + trigram on the stored search document.
 * Callers hydrate a page with a single `findMany` + `include` (no N+1).
 */
async function searchProductIds(rawQuery: string): Promise<string[]> {
  const like = `%${escapeIlike(rawQuery)}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM products p
    WHERE p.search_vector @@ websearch_to_tsquery('simple', ${rawQuery})
       OR p.search_text ILIKE ${like} ESCAPE '\\'
    ORDER BY
      ts_rank_cd(p.search_vector, websearch_to_tsquery('simple', ${rawQuery})) DESC,
      p.slug ASC
  `;
  return rows.map((row) => row.id);
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

function variantWriteData(productId: string, variant: ProductVariant) {
  return {
    id: variant.id,
    productId,
    sku: variant.sku,
    barcode: variant.barcode,
    frameSize: variant.frameSize,
    wheelSize: variant.wheelSize,
    color: variant.color,
    listPriceMinor: variant.listPriceMinor,
    currency: variant.currency,
    status: toPrismaStatus(variant.status),
    isActive: variant.isActive,
  };
}

function variantUpdateData(variant: ProductVariant) {
  return {
    sku: variant.sku,
    barcode: variant.barcode,
    frameSize: variant.frameSize,
    wheelSize: variant.wheelSize,
    color: variant.color,
    listPriceMinor: variant.listPriceMinor,
    status: toPrismaStatus(variant.status),
    isActive: variant.isActive,
  };
}

async function resolveMediaId(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<string> {
  const existing = await tx.mediaAsset.findUnique({ where: { key } });
  if (existing) {
    return existing.id;
  }
  const created = await tx.mediaAsset.create({
    data: { key, contentType: "application/octet-stream", byteSize: 0 },
  });
  return created.id;
}

async function syncVariantMedia(
  tx: Prisma.TransactionClient,
  variantId: string,
  images: readonly ProductImage[],
): Promise<void> {
  await tx.variantMedia.deleteMany({ where: { variantId } });
  for (const image of images) {
    const mediaId = await resolveMediaId(tx, image.key);
    await tx.variantMedia.create({
      data: {
        variantId,
        mediaId,
        role: image.role,
        sortOrder: image.sortOrder,
        alt: image.alt,
      },
    });
  }
}

async function syncProductMedia(
  tx: Prisma.TransactionClient,
  productId: string,
  images: readonly ProductImage[],
): Promise<void> {
  await tx.productMedia.deleteMany({ where: { productId } });
  for (const image of images) {
    const mediaId = await resolveMediaId(tx, image.key);
    await tx.productMedia.create({
      data: {
        productId,
        mediaId,
        role: image.role,
        sortOrder: image.sortOrder,
        alt: image.alt,
      },
    });
  }
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

    async findById(id) {
      const row = await prisma.product.findUnique({
        where: { id },
        include: adminProductInclude,
      });
      return row ? toProduct(row) : null;
    },

    async listPublished(query) {
      const where = await buildWhere(query);
      if (!where) {
        return { items: [], total: 0 };
      }
      let rankedSearchIds: string[] | null = null;
      if (query.filters.q) {
        rankedSearchIds = await searchProductIds(query.filters.q);
        if (rankedSearchIds.length === 0) {
          return { items: [], total: 0 };
        }
        where.id = { in: rankedSearchIds };
      }
      if (query.sort.field === "relevance") {
        const matched = await prisma.product.findMany({
          where,
          select: { id: true },
        });
        const allowed = new Set(matched.map((row) => row.id));
        const ordered = (rankedSearchIds ?? matched.map((row) => row.id)).filter((id) =>
          allowed.has(id),
        );
        const total = ordered.length;
        const start = (query.page - 1) * query.pageSize;
        const pageIds = ordered.slice(start, start + query.pageSize);
        if (pageIds.length === 0) {
          return { items: [], total };
        }
        const rows = await prisma.product.findMany({
          where: { id: { in: pageIds } },
          include: productInclude,
        });
        return { items: orderProductsByIds(rows.map(toProduct), pageIds), total };
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

    async listAll() {
      const rows = await prisma.product.findMany({
        include: adminProductInclude,
        orderBy: [{ name: "asc" }, { slug: "asc" }],
      });
      return rows.map(toProduct);
    },

    async save(product) {
      const brand = await prisma.brand.findUnique({ where: { slug: product.brandSlug } });
      if (!brand) {
        throw new ValidationError("unknown brand", { brandSlug: product.brandSlug });
      }
      const category = await prisma.category.findUnique({
        where: { slug: product.categorySlug },
      });
      if (!category) {
        throw new ValidationError("unknown category", {
          categorySlug: product.categorySlug,
        });
      }
      const slugOwner = await prisma.product.findUnique({
        where: { slug: product.slug },
      });
      if (slugOwner && slugOwner.id !== product.id) {
        throw new ConflictError("slug already exists", { slug: product.slug });
      }
      const existing = await prisma.product.findUnique({
        where: { id: product.id },
        include: { variants: true },
      });
      const data = {
        brandId: brand.id,
        categoryId: category.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        status: product.status,
        publishedAt: product.publishedAt,
        bicycleType: product.bicycleType,
        frameMaterial: product.frameMaterial,
        groupset: product.groupset,
        brakeType: product.brakeType,
        modelYear: product.modelYear,
        warrantyMonths: product.warrantyMonths,
        warrantyText: product.warrantyText,
      };
      try {
        await prisma.$transaction(async (tx) => {
          if (existing) {
            await tx.product.update({ where: { id: product.id }, data });
            const keep = new Set(product.variants.map((variant) => variant.id));
            const removed = existing.variants.filter((row) => !keep.has(row.id));
            if (removed.length > 0) {
              await tx.productVariant.deleteMany({
                where: { id: { in: removed.map((row) => row.id) } },
              });
            }
            for (const variant of product.variants) {
              await tx.productVariant.upsert({
                where: { id: variant.id },
                create: variantWriteData(product.id, variant),
                update: variantUpdateData(variant),
              });
              await syncVariantMedia(tx, variant.id, variant.images);
            }
            await syncProductMedia(tx, product.id, product.images);
          } else {
            await tx.product.create({
              data: {
                id: product.id,
                ...data,
                variants: {
                  create: product.variants.map((variant) => ({
                    ...variantWriteData(product.id, variant),
                  })),
                },
              },
            });
            for (const variant of product.variants) {
              await syncVariantMedia(tx, variant.id, variant.images);
            }
            await syncProductMedia(tx, product.id, product.images);
          }
        });
      } catch (error) {
        mapUniqueViolation(error);
      }
      const saved = await prisma.product.findUnique({
        where: { id: product.id },
        include: adminProductInclude,
      });
      if (!saved) {
        throw new Error("product save failed");
      }
      return toProduct(saved);
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
