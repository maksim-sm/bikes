# ADR-0032: Admin audit log

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0029](0029-admin-shell-authorization.md)

## Context

ADR-0029 started writing `audit_logs` after admin product and shipment
mutations. Inventory (ADR-0031) added stock writes. The console still could not
list the ledger, product updates omitted prices, and customer access, refunds,
order status, and role changes had no row. Payloads were unsanitized.

## Decision

1. **Staff list is admin-only.** `audit.listRecent` requires the `admin`
   title. `/admin/audit` filters by action, entity type, and entity id.
2. **Every listed sensitive write records a row** after the service succeeds:
   product and price changes, stock receive/adjust/return, order complete and
   cancel, refunds (status + amount only), customer access, delivery
   configuration (assign / tracking / ship / deliver), and staff role changes.
3. **Payloads are sanitized in `prepareAuditRecord`.** Keys that look like
   secrets or payment instruments (`password`, `token`, `card`, `cvv`,
   `rawBody`, `providerPayload`, …) become `[redacted]`. Amounts and status
   remain.
4. **Role and customer surfaces stay on the admin title / `read_any_customer`.**
   An admin cannot remove their own `admin` title. Customer lookup stores
   `userId` and email only.

## Alternatives considered

**Let every staff title read the log.** Rejected: role changes and customer
access are not warehouse work.

**Store the raw provider webhook for forensics.** Rejected: that is payment
instrument and secret material. Status + amount is enough to reconstruct a
refund.

## Reasons

- Traceability is useless if the console cannot list the rows.
- A leaked audit table must not contain passwords or PAN.

## Consequences

- `/admin/staff` and `/admin/customers` exist so role changes and customer
  access have a write path to audit.
- Order complete / cancel / refund live on `/admin/deliveries` so clerks can
  produce those rows without a second order console.

## When to revisit

A compliance requirement to retain raw provider payloads in a separate,
encrypted vault. A dedicated SIEM export.
