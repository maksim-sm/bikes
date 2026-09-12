import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { Button, Container, TextLink } from "@/ui";
import { staffLogoutAction } from "../login/actions";
import { requireAdminStaff, visibleAdminNav } from "../_lib/staff";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({ children }: { children: ReactNode }) {
  const principal = await requireAdminStaff();
  const items = visibleAdminNav(principal);

  return (
    <div className={styles.shell}>
      <Container>
        <div className={styles.shellInner}>
          <aside className={styles.sidebar}>
            <p className={styles.brand}>{t.admin.title}</p>
            <nav aria-label={t.admin.nav} className={styles.nav}>
              {items.map((item) => (
                <TextLink key={item.href} href={item.href} subtle>
                  {t.admin[item.labelKey]}
                </TextLink>
              ))}
            </nav>
            <p className={styles.sessionHint}>{t.admin.sessionIdleHint}</p>
            <form action={staffLogoutAction}>
              <Button type="submit" variant="quiet">
                {t.admin.signOut}
              </Button>
            </form>
          </aside>
          <div className={styles.content}>{children}</div>
        </div>
      </Container>
    </div>
  );
}
