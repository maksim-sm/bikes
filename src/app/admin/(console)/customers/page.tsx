import type { Metadata } from "next";
import { getAuthServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { Button, TextField } from "@/ui";
import { recordAdminAudit } from "../../_lib/audit";
import { requireAdminCustomerRead } from "../../_lib/staff";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.customers,
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const principal = await requireAdminCustomerRead();
  const email = (await searchParams).email?.trim() ?? "";
  let found: { userId: string; email: string } | null = null;
  let lookupError: string | null = null;
  if (email.length > 0) {
    try {
      found = await (await getAuthServices()).lookupCustomer(principal, email);
      await recordAdminAudit(principal, {
        action: "customer.access",
        entityType: "customer",
        entityId: found.userId,
        after: { userId: found.userId, email: found.email },
      });
    } catch (error) {
      if (isAppError(error) && error.code === "not_found") {
        lookupError = t.admin.customerEmpty;
      } else {
        throw error;
      }
    }
  }

  return (
    <div className={styles.page}>
      <h1>{t.admin.customers}</h1>
      <p className={styles.hint}>{t.admin.customersLead}</p>
      <form method="get" className={styles.form}>
        <TextField
          name="email"
          type="email"
          label={t.fields.email}
          defaultValue={email}
          required
          autoComplete="off"
        />
        <Button type="submit">{t.actions.search}</Button>
      </form>
      {lookupError ? (
        <p className={styles.error} role="status">
          {lookupError}
        </p>
      ) : null}
      {found ? (
        <table className={styles.table}>
          <tbody>
            <tr>
              <th>{t.admin.customerId}</th>
              <td>{found.userId}</td>
            </tr>
            <tr>
              <th>{t.fields.email}</th>
              <td>{found.email}</td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
