import { t } from "@/lib/i18n";
import { Button, Container, TextLink } from "@/ui";
import { staffLogoutAction } from "../login/actions";
import { requireAdminCatalog } from "../_lib/staff";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminCatalog();

  return (
    <Container>
      <div className={styles.bar}>
        <nav className={styles.nav} aria-label={t.admin.nav}>
          <TextLink href="/admin/products" subtle>
            {t.admin.products}
          </TextLink>
          <TextLink href="/admin/products/new" subtle>
            {t.admin.newProduct}
          </TextLink>
        </nav>
        <form action={staffLogoutAction}>
          <Button type="submit" variant="quiet">
            {t.admin.signOut}
          </Button>
        </form>
      </div>
      {children}
    </Container>
  );
}
