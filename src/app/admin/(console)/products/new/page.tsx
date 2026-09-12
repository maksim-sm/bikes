import type { Metadata } from "next";
import { getCatalogServices } from "@/app/api/_lib/compose";
import { t } from "@/lib/i18n";
import { requireAdminCatalog } from "../../../_lib/staff";
import styles from "../../../admin.module.css";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.newProduct,
};

export default async function NewProductPage() {
  await requireAdminCatalog();
  const catalog = await getCatalogServices();
  const [brands, categories] = await Promise.all([
    catalog.listBrands(),
    catalog.listCategories(),
  ]);

  return (
    <div className={styles.page}>
      <h1>{t.admin.newProduct}</h1>
      <ProductForm product={null} brands={brands} categories={categories} />
    </div>
  );
}
