import type { Metadata } from "next";
import { getAuditServices, getAuthServices } from "@/app/api/_lib/compose";
import { formatStoreDateTime, t } from "@/lib/i18n";
import { Button, TextField } from "@/ui";
import { auditActionLabel, formatAuditJson } from "../../_lib/audit-copy";
import { requireAdminTitle } from "../../_lib/staff";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.audit,
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; entityId?: string }>;
}) {
  const principal = await requireAdminTitle();
  const filters = await searchParams;
  const action = filters.action?.trim() ?? "";
  const entityType = filters.entityType?.trim() ?? "";
  const entityId = filters.entityId?.trim() ?? "";
  const rows = await getAuditServices().listRecent(principal, {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
  });
  const emails = new Map(
    (
      await (
        await getAuthServices()
      ).lookupEmails(
        principal,
        rows.flatMap((row) => (row.actorUserId ? [row.actorUserId] : [])),
      )
    ).map((row) => [row.userId, row.email]),
  );

  return (
    <div className={styles.page}>
      <h1>{t.admin.audit}</h1>
      <p className={styles.hint}>{t.admin.auditLead}</p>
      <form method="get" className={styles.form}>
        <TextField
          name="action"
          label={t.admin.auditAction}
          defaultValue={action}
          autoComplete="off"
        />
        <TextField
          name="entityType"
          label={t.admin.auditEntityType}
          defaultValue={entityType}
          autoComplete="off"
        />
        <TextField
          name="entityId"
          label={t.admin.auditEntityId}
          defaultValue={entityId}
          autoComplete="off"
        />
        <Button type="submit">{t.actions.search}</Button>
      </form>
      {rows.length === 0 ? (
        <p className={styles.hint}>{t.admin.auditEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.admin.auditTime}</th>
              <th>{t.admin.actor}</th>
              <th>{t.admin.auditAction}</th>
              <th>{t.admin.auditEntityType}</th>
              <th>{t.admin.auditEntityId}</th>
              <th>{t.admin.auditBefore}</th>
              <th>{t.admin.auditAfter}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatStoreDateTime(row.createdAt)}</td>
                <td>
                  {row.actorUserId
                    ? (emails.get(row.actorUserId) ?? row.actorUserId)
                    : t.admin.inventoryActorSystem}
                </td>
                <td>{auditActionLabel(row.action)}</td>
                <td>{row.entityType}</td>
                <td>{row.entityId}</td>
                <td>
                  <code className={styles.payload}>{formatAuditJson(row.before)}</code>
                </td>
                <td>
                  <code className={styles.payload}>{formatAuditJson(row.after)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
