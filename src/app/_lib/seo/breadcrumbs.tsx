import { t } from "@/lib/i18n";
import { TextLink } from "@/ui";
import type { BreadcrumbItem } from "./schema";
import { JsonLd } from "./json-ld";
import { breadcrumbJsonLd } from "./schema";
import styles from "./breadcrumbs.module.css";

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label={t.seo.breadcrumbs} className={styles.nav}>
        <ol className={styles.list}>
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={item.path} className={styles.item}>
                {last ? (
                  <span aria-current="page">{item.name}</span>
                ) : (
                  <TextLink href={item.path} subtle>
                    {item.name}
                  </TextLink>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

export function storefrontCrumbs(...trail: BreadcrumbItem[]): BreadcrumbItem[] {
  return [{ name: t.seo.home, path: "/" }, ...trail];
}
