import { t } from "@/lib/i18n";
import { Button, Container, TextLink } from "@/ui";
import { staffLogoutAction } from "../login/actions";
import { canManageCatalog, canManageOrders, requireAdminStaff } from "../_lib/staff";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const principal = await requireAdminStaff();

  return (
    <Container>
      <div className={styles.bar}>
        <nav className={styles.nav} aria-label={t.admin.nav}>
          {canManageCatalog(principal) ? (
            <>
              <TextLink href="/admin/products" subtle>
                {t.admin.products}
              </TextLink>
              <TextLink href="/admin/products/new" subtle>
                {t.admin.newProduct}
              </TextLink>
            </>
          ) : null}
          {canManageOrders(principal) ? (
            <TextLink href="/admin/deliveries" subtle>
              {t.admin.deliveries}
            </TextLink>
          ) : null}
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
