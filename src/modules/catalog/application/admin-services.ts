import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireCatalogRole } from "@/modules/identity";
import type { Principal } from "@/modules/identity";
import {
  assertRequiredProduct,
  normalizeProductSlug,
  publishProduct,
  unpublishProduct,
  type Product,
  type ProductWriteInput,
} from "../domain/product";
import type { CatalogRepository, Clock } from "./ports";

export interface CatalogAdminServices {
  listProducts(principal: Principal): Promise<Product[]>;
  getProduct(principal: Principal, id: string): Promise<Product>;
  createProduct(principal: Principal, input: ProductWriteInput): Promise<Product>;
  updateProduct(
    principal: Principal,
    id: string,
    input: ProductWriteInput,
  ): Promise<Product>;
  publish(principal: Principal, id: string): Promise<Product>;
  unpublish(principal: Principal, id: string): Promise<Product>;
}

function mapWriteError(error: unknown): never {
  if (error instanceof Error) {
    const messages: Record<string, string> = {
      product_name_required: "name is required",
      product_description_required: "description is required",
      product_slug_invalid: "slug must be lowercase letters, digits, and hyphens",
      product_brand_required: "brand is required",
      product_category_required: "category is required",
      product_type_invalid: "bicycle type is invalid",
      product_variant_required: "at least one active variant is required",
      product_sku_required: "sku is required",
      product_frame_size_required: "frame size is required",
      product_wheel_size_required: "wheel size is required",
      product_color_required: "color is required",
      product_price_invalid: "list price must be a positive integer in kopeks",
      product_not_published: "product is not published",
    };
    const mapped = messages[error.message];
    if (mapped) {
      throw new ValidationError(mapped, { reason: error.message });
    }
  }
  throw error;
}

export function createCatalogAdminServices(deps: {
  catalog: CatalogRepository;
  clock: Clock;
}): CatalogAdminServices {
  async function load(id: string): Promise<Product> {
    const product = await deps.catalog.findById(id);
    if (!product) {
      throw new NotFoundError("product not found", { id });
    }
    return product;
  }

  async function resolveNames(input: ProductWriteInput): Promise<{
    brandName: string;
    brandSlug: string;
    categorySlug: string;
  }> {
    const [brands, categories] = await Promise.all([
      deps.catalog.listBrands(),
      deps.catalog.listCategories(),
    ]);
    const brand = brands.find((item) => item.slug === input.brandSlug);
    if (!brand) {
      throw new ValidationError("unknown brand", { brandSlug: input.brandSlug });
    }
    const category = categories.find((item) => item.slug === input.categorySlug);
    if (!category) {
      throw new ValidationError("unknown category", { categorySlug: input.categorySlug });
    }
    return { brandName: brand.name, brandSlug: brand.slug, categorySlug: category.slug };
  }

  async function write(
    existing: Product | null,
    input: ProductWriteInput,
  ): Promise<Product> {
    try {
      assertRequiredProduct(input);
    } catch (error) {
      mapWriteError(error);
    }
    const slug = normalizeProductSlug(input.slug);
    const names = await resolveNames(input);
    const clash = await deps.catalog.findBySlug(slug);
    if (clash && clash.id !== existing?.id) {
      throw new ConflictError("slug already exists", { slug });
    }
    const productId = existing?.id ?? crypto.randomUUID();
    const product: Product = {
      id: productId,
      slug,
      name: input.name.trim(),
      description: input.description.trim(),
      status: existing?.status ?? "DRAFT",
      publishedAt: existing?.publishedAt ?? null,
      brandName: names.brandName,
      brandSlug: names.brandSlug,
      categorySlug: names.categorySlug,
      bicycleType: input.bicycleType,
      frameMaterial: input.frameMaterial,
      groupset: input.groupset,
      brakeType: input.brakeType,
      modelYear: input.modelYear,
      warrantyMonths: input.warrantyMonths,
      warrantyText: input.warrantyText,
      images: existing?.images ?? [],
      variants: input.variants.map((variant, index) => ({
        id: variant.id ?? existing?.variants[index]?.id ?? crypto.randomUUID(),
        productId,
        sku: variant.sku.trim(),
        frameSize: variant.frameSize.trim(),
        wheelSize: variant.wheelSize.trim(),
        color: variant.color.trim(),
        listPriceMinor: variant.listPriceMinor,
        currency: "BYN",
        isActive: variant.isActive ?? true,
      })),
    };
    return deps.catalog.save(product);
  }

  return {
    async listProducts(principal) {
      requireCatalogRole(principal);
      return deps.catalog.listAll();
    },

    async getProduct(principal, id) {
      requireCatalogRole(principal);
      return load(id);
    },

    async createProduct(principal, input) {
      requireCatalogRole(principal);
      return write(null, input);
    },

    async updateProduct(principal, id, input) {
      requireCatalogRole(principal);
      return write(await load(id), input);
    },

    async publish(principal, id) {
      requireCatalogRole(principal);
      const product = await load(id);
      try {
        return await deps.catalog.save(publishProduct(product, deps.clock.now()));
      } catch (error) {
        mapWriteError(error);
      }
    },

    async unpublish(principal, id) {
      requireCatalogRole(principal);
      const product = await load(id);
      try {
        return await deps.catalog.save(unpublishProduct(product));
      } catch (error) {
        mapWriteError(error);
      }
    },
  };
}
