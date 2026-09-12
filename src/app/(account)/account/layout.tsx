import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { Container, TextLink } from "@/ui";
import { requireAccountCustomer } from "../_lib/guard";
import styles from "../account.module.css";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireAccountCustomer();

  return (
    <Container>
      <div className={styles.page}>
        <div className={styles.layout}>
          <nav aria-label={t.account.nav} className={styles.nav}>
            <TextLink href="/account" subtle>
              {t.account.overview}
            </TextLink>
            <TextLink href="/account/profile" subtle>
              {t.account.profile}
            </TextLink>
            <TextLink href="/account/addresses" subtle>
              {t.account.addresses}
            </TextLink>
            <TextLink href="/account/orders" subtle>
              {t.account.orders}
            </TextLink>
            <TextLink href="/account/wishlist" subtle>
              {t.account.wishlist}
            </TextLink>
            <TextLink href="/account/security" subtle>
              {t.account.security}
            </TextLink>
            <LogoutButton />
          </nav>
          <div>{children}</div>
        </div>
      </div>
    </Container>
  );
}
