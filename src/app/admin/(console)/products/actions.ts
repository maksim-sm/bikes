"use server";

import { redirect } from "next/navigation";
import { getCatalogAdminServices, getMediaServices } from "@/app/api/_lib/compose";
import { imageKeysOf } from "@/modules/catalog";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { adminHref } from "../../_lib/paths";
import { parseProductForm } from "../../_lib/product-form";
import { recordAdminAudit } from "../../_lib/audit";
import { requireAdminCatalog } from "../../_lib/staff";

export type ProductFormState = { ok: boolean; message: string } | null;

const WRITE_ERRORS: Record<string, string> = {
  variant_sku_duplicate: t.admin.skuDuplicate,
  variant_combination_duplicate: t.admin.combinationDuplicate,
  variant_barcode_duplicate: t.admin.barcodeDuplicate,
  product_image_alt_required: t.admin.imageAltRequired,
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
    await recordAdminAudit(principal, {
      action: "catalog.product.create",
      entityType: "product",
      entityId: created.id,
      after: { slug: created.slug, status: created.status },
    });
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
    const admin = await getCatalogAdminServices();
    const before = await admin.getProduct(principal, id);
    const after = await admin.updateProduct(principal, id, parsed);
    await recordAdminAudit(principal, {
      action: "catalog.product.update",
      entityType: "product",
      entityId: id,
      before: { status: before.status },
      after: { status: after.status },
    });
    const removed = [...imageKeysOf(before)].filter(
      (key) => !imageKeysOf(after).has(key),
    );
    if (removed.length > 0) {
      const media = await getMediaServices();
      await Promise.all(
        removed.map((key) => media.delete(principal, key).catch(() => undefined)),
      );
    }
    return { ok: true, message: t.admin.saved };
  } catch (error) {
    return fail(error);
  }
}

export async function publishProductAction(formData: FormData): Promise<void> {
  const principal = await requireAdminCatalog();
  const id = String(formData.get("id") ?? "");
  await getCatalogAdminServices().then((admin) => admin.publish(principal, id));
  await recordAdminAudit(principal, {
    action: "catalog.product.publish",
    entityType: "product",
    entityId: id,
  });
  redirect(adminHref(`/admin/products/${id}`));
}

export async function unpublishProductAction(formData: FormData): Promise<void> {
  const principal = await requireAdminCatalog();
  const id = String(formData.get("id") ?? "");
  await getCatalogAdminServices().then((admin) => admin.unpublish(principal, id));
  await recordAdminAudit(principal, {
    action: "catalog.product.unpublish",
    entityType: "product",
    entityId: id,
  });
  redirect(adminHref(`/admin/products/${id}`));
}
