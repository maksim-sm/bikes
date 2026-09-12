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
    const id = String(formData.get(`variant-${index}-id`) ?? "").trim();
    variants.push({
      ...(id.length > 0 ? { id } : {}),
      sku: String(formData.get(`variant-${index}-sku`) ?? ""),
      frameSize: String(formData.get(`variant-${index}-frameSize`) ?? ""),
      wheelSize: String(formData.get(`variant-${index}-wheelSize`) ?? ""),
      color: String(formData.get(`variant-${index}-color`) ?? ""),
      listPriceMinor: price,
      isActive: formData.get(`variant-${index}-active`) === "on",
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
    variants,
  };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export { BICYCLE_TYPES };
