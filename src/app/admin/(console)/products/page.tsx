import type { Metadata } from "next";
import { getCatalogAdminServices } from "@/app/api/_lib/compose";
import { formatPrice, t } from "@/lib/i18n";
import { ButtonLink, TextLink } from "@/ui";
import { requireAdminCatalog } from "../../_lib/staff";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.products,
};

function statusLabel(status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): string {
  if (status === "PUBLISHED") {
    return t.admin.statusPublished;
  }
  if (status === "ARCHIVED") {
    return t.admin.statusArchived;
  }
  return t.admin.statusDraft;
}

export default async function AdminProductsPage() {
  const principal = await requireAdminCatalog();
  const products = await (await getCatalogAdminServices()).listProducts(principal);

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <h1>{t.admin.products}</h1>
        <ButtonLink href="/admin/products/new">{t.admin.newProduct}</ButtonLink>
      </div>
      {products.length === 0 ? (
        <p className={styles.hint}>{t.admin.listEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.product.model}</th>
              <th>{t.admin.brand}</th>
              <th>{t.product.price}</th>
              <th>{t.admin.status}</th>
              <th>{t.admin.editProduct}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const price = product.variants[0]?.listPriceMinor;
              return (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.brandName}</td>
                  <td>{price !== undefined ? formatPrice(price) : "—"}</td>
                  <td>
                    <span
                      className={
                        product.status === "PUBLISHED"
                          ? `${styles.badge} ${styles.badgePublished}`
                          : `${styles.badge} ${styles.badgeDraft}`
                      }
                    >
                      {statusLabel(product.status)}
                    </span>
                  </td>
                  <td>
                    <TextLink href={`/admin/products/${product.id}`}>
                      {t.actions.continue}
                    </TextLink>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
