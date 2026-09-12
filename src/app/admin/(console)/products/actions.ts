"use server";

import { redirect } from "next/navigation";
import { getCatalogAdminServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { adminHref } from "../../_lib/paths";
import { parseProductForm } from "../../_lib/product-form";
import { requireAdminCatalog } from "../../_lib/staff";

export type ProductFormState = { ok: boolean; message: string } | null;

const WRITE_ERRORS: Record<string, string> = {
  variant_sku_duplicate: t.admin.skuDuplicate,
  variant_combination_duplicate: t.admin.combinationDuplicate,
  variant_barcode_duplicate: t.admin.barcodeDuplicate,
};

function fail(error: unknown): ProductFormState {
  if (isAppError(error)) {
    const reason = String(error.context.reason ?? "");
    const mapped = WRITE_ERRORS[reason];
    if (mapped) {
      return { ok: false, message: mapped };
    }
  }
  return { ok: false, message: t.admin.saveFailed };
}

export async function createProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const principal = await requireAdminCatalog();
  const parsed = parseProductForm(formData);
  if ("error" in parsed) {
    return { ok: false, message: WRITE_ERRORS[parsed.error] ?? t.admin.saveFailed };
  }
  let createdId: string;
  try {
    const created = await getCatalogAdminServices().then((admin) =>
      admin.createProduct(principal, parsed),
    );
    createdId = created.id;
  } catch (error) {
    return fail(error);
  }
  redirect(adminHref(`/admin/products/${createdId}`));
}

export async function updateProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const principal = await requireAdminCatalog();
  const id = String(formData.get("id") ?? "");
  const parsed = parseProductForm(formData);
  if ("error" in parsed) {
    return { ok: false, message: WRITE_ERRORS[parsed.error] ?? t.admin.saveFailed };
  }
  try {
    await getCatalogAdminServices().then((admin) =>
      admin.updateProduct(principal, id, parsed),
    );
    return { ok: true, message: t.admin.saved };
  } catch (error) {
    return fail(error);
  }
}

export async function publishProductAction(formData: FormData): Promise<void> {
  const principal = await requireAdminCatalog();
  const id = String(formData.get("id") ?? "");
  await getCatalogAdminServices().then((admin) => admin.publish(principal, id));
  redirect(adminHref(`/admin/products/${id}`));
}

export async function unpublishProductAction(formData: FormData): Promise<void> {
  const principal = await requireAdminCatalog();
  const id = String(formData.get("id") ?? "");
  await getCatalogAdminServices().then((admin) => admin.unpublish(principal, id));
  redirect(adminHref(`/admin/products/${id}`));
}
