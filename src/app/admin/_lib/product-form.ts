import { BICYCLE_TYPES, isBicycleType, type ProductWriteInput } from "@/modules/catalog";
import { parsePriceBynToMinor } from "./money";

export function parseProductForm(
  formData: FormData,
): ProductWriteInput | { error: string } {
  const bicycleType = String(formData.get("bicycleType") ?? "");
  if (!isBicycleType(bicycleType)) {
    return { error: "product_type_invalid" };
  }
  const count = Number(formData.get("variantCount") ?? "0");
  if (!Number.isInteger(count) || count < 1 || count > 12) {
    return { error: "product_variant_required" };
  }
  const variants: ProductWriteInput["variants"][number][] = [];
  for (let index = 0; index < count; index += 1) {
    const price = parsePriceBynToMinor(
      String(formData.get(`variant-${index}-price`) ?? ""),
    );
    if (price === null) {
      return { error: "product_price_invalid" };
    }
    const statusRaw = String(formData.get(`variant-${index}-status`) ?? "active");
    if (statusRaw !== "active" && statusRaw !== "inactive") {
      return { error: "variant_status_invalid" };
    }
    const status = statusRaw;
    const id = String(formData.get(`variant-${index}-id`) ?? "").trim();
    variants.push({
      ...(id.length > 0 ? { id } : {}),
      sku: String(formData.get(`variant-${index}-sku`) ?? ""),
      barcode: emptyToNull(String(formData.get(`variant-${index}-barcode`) ?? "")),
      frameSize: String(formData.get(`variant-${index}-frameSize`) ?? ""),
      wheelSize: String(formData.get(`variant-${index}-wheelSize`) ?? ""),
      color: String(formData.get(`variant-${index}-color`) ?? ""),
      listPriceMinor: price,
      status,
      isActive: status === "active",
      images: parseImages(formData, `variant-${index}-image`),
    });
  }
  const modelYearRaw = String(formData.get("modelYear") ?? "").trim();
  const warrantyRaw = String(formData.get("warrantyMonths") ?? "").trim();
  return {
    slug: String(formData.get("slug") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    brandSlug: String(formData.get("brandSlug") ?? ""),
    categorySlug: String(formData.get("categorySlug") ?? ""),
    bicycleType,
    frameMaterial: emptyToNull(String(formData.get("frameMaterial") ?? "")),
    groupset: emptyToNull(String(formData.get("groupset") ?? "")),
    brakeType: emptyToNull(String(formData.get("brakeType") ?? "")),
    modelYear: modelYearRaw.length > 0 ? Number(modelYearRaw) : null,
    warrantyMonths: warrantyRaw.length > 0 ? Number(warrantyRaw) : null,
    warrantyText: emptyToNull(String(formData.get("warrantyText") ?? "")),
    images: parseImages(formData, "image"),
    variants,
  };
}

function parseImages(formData: FormData, prefix: string) {
  const count = Number(formData.get(`${prefix}Count`) ?? "0");
  if (!Number.isInteger(count) || count < 0 || count > 12) {
    return [];
  }
  const images: NonNullable<ProductWriteInput["images"]>[number][] = [];
  for (let index = 0; index < count; index += 1) {
    const key = String(formData.get(`${prefix}-${index}-key`) ?? "").trim();
    if (key.length === 0) {
      continue;
    }
    images.push({
      key,
      alt: String(formData.get(`${prefix}-${index}-alt`) ?? ""),
      role: index === 0 ? "PRIMARY" : "GALLERY",
      sortOrder: index,
    });
  }
  return images;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export { BICYCLE_TYPES };
