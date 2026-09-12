import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogAdminServices, getCatalogServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { Button, TextLink } from "@/ui";
import { requireAdminCatalog } from "../../../_lib/staff";
import styles from "../../../admin.module.css";
import { publishProductAction, unpublishProductAction } from "../actions";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `${t.admin.editProduct} — ${(await params).id}` };
}

export default async function EditProductPage({ params }: PageProps) {
  const principal = await requireAdminCatalog();
  const { id } = await params;
  const admin = await getCatalogAdminServices();
  let product;
  try {
    product = await admin.getProduct(principal, id);
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") {
      notFound();
    }
    throw error;
  }
  const catalog = await getCatalogServices();
  const [brands, categories] = await Promise.all([
    catalog.listBrands(),
    catalog.listCategories(),
  ]);
  const listed = product.status === "PUBLISHED";

  return (
    <div className={styles.page}>
      <h1>
        {t.admin.editProduct}: {product.name}
      </h1>
      <p>
        <span
          className={
            listed
              ? `${styles.badge} ${styles.badgePublished}`
              : `${styles.badge} ${styles.badgeDraft}`
          }
        >
          {listed ? t.admin.statusPublished : t.admin.statusDraft}
        </span>{" "}
        {listed ? (
          <TextLink href={`/products/${product.slug}`}>{t.admin.openStorefront}</TextLink>
        ) : (
          <span className={styles.hint}>{t.admin.hiddenFromStorefront}</span>
        )}
      </p>
      <div className={styles.actions}>
        {listed ? (
          <form action={unpublishProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <Button type="submit">{t.admin.unpublish}</Button>
          </form>
        ) : (
          <form action={publishProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <Button type="submit" variant="primary">
              {t.admin.publish}
            </Button>
          </form>
        )}
      </div>
      <ProductForm product={product} brands={brands} categories={categories} />
    </div>
  );
}
