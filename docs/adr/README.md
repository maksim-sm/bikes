# Architecture decision records

Each file records one decision that has already been made, so it does not get
relitigated by whoever next touches the relevant code. An ADR is not a proposal
and not a design doc: it states what was decided, what else was considered, why,
what it costs us, and — the part most often omitted — the specific conditions
under which reopening it would be legitimate.

Rules:

- ADRs are **append-only**. To change a decision, add a new ADR that supersedes
  the old one and mark the old one `Superseded by ADR-NNNN`. Do not edit the
  decision of an accepted ADR.
- If you find yourself arguing against an accepted ADR, check its "when to
  revisit" section first. If your argument is listed there, write the superseding
  ADR. If it is not, the decision stands.
- `docs/architecture.md` is the current-state contract; these records are the
  history of how it got that way. When they disagree, the most recent accepted
  ADR is correct and the contract needs updating.

| ADR                                                | Decision                                        | Status                                                                   |
| -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| [0001](0001-modular-monolith.md)                   | Modular monolith, not microservices             | Accepted                                                                 |
| [0002](0002-nextjs-app-router.md)                  | Next.js App Router                              | Accepted                                                                 |
| [0003](0003-postgresql.md)                         | PostgreSQL                                      | Accepted                                                                 |
| [0004](0004-prisma.md)                             | Prisma as ORM, pinned to stable                 | Accepted                                                                 |
| [0005](0005-provider-neutral-payments.md)          | Provider-neutral payment abstraction            | Accepted (amended by [0022](0022-payment-provider-operations.md))        |
| [0006](0006-manual-first-delivery.md)              | Manual-first delivery integration               | Accepted (amended by [0025](0025-belarus-delivery-configuration.md))     |
| [0007](0007-object-storage-media.md)               | Object storage for media, keys not URLs         | Accepted                                                                 |
| [0008](0008-testing-strategy.md)                   | Testing strategy                                | Accepted                                                                 |
| [0009](0009-russian-first-i18n.md)                 | Russian-first localization                      | Accepted                                                                 |
| [0010](0010-byn-money-representation.md)           | BYN money as integer minor units                | Accepted                                                                 |
| [0011](0011-css-modules-design-tokens.md)          | CSS Modules with design tokens                  | Accepted                                                                 |
| [0012](0012-first-catalogue-schema.md)             | Variants own stock grain; no EAV                | Partially superseded by [0014](0014-race-safe-inventory.md)              |
| [0013](0013-independent-commerce-statuses.md)      | Independent order/payment/fulfillment statuses  | Accepted (amended by [0023](0023-server-authoritative-payment-state.md)) |
| [0014](0014-race-safe-inventory.md)                | Race-safe inventory ledger in `inventory`       | Accepted (amended by [0024](0024-payment-failure-releases-holds.md))     |
| [0015](0015-http-route-handler-contract.md)        | Route Handler envelope, auth, and DTOs          | Accepted                                                                 |
| [0016](0016-customer-authentication.md)            | Argon2id + hashed httpOnly sessions             | Accepted                                                                 |
| [0017](0017-staff-authorization-roles.md)          | Staff job titles and ownership checks           | Accepted                                                                 |
| [0018](0018-postgres-catalog-listing.md)           | Catalogue listing in PostgreSQL, no ES          | Accepted                                                                 |
| [0019](0019-postgres-catalog-search.md)            | Indexed Postgres FTS for catalogue search       | Accepted                                                                 |
| [0020](0020-persistent-cart.md)                    | Persistent carts; server-side price/stock       | Accepted                                                                 |
| [0021](0021-server-controlled-checkout.md)         | Checkout totals and reservation are server-side | Accepted                                                                 |
| [0022](0022-payment-provider-operations.md)        | Replaceable payment provider operations         | Accepted                                                                 |
| [0023](0023-server-authoritative-payment-state.md) | Server-authoritative payment lifecycle          | Accepted                                                                 |
| [0024](0024-payment-failure-releases-holds.md)     | Failed/expired payments release holds once      | Accepted                                                                 |
| [0025](0025-belarus-delivery-configuration.md)     | Belarus delivery kinds, zones, and assignment   | Accepted (amended by [0026](0026-staff-entered-shipment-tracking.md))    |
| [0026](0026-staff-entered-shipment-tracking.md)    | Staff-entered shipment tracking, no carrier API | Accepted                                                                 |
| [0027](0027-customer-account-area.md)              | Customer self-service account area              | Accepted (amended by [0028](0028-persistent-wishlist.md))                |
| [0028](0028-persistent-wishlist.md)                | Persistent wishlist; no duplicates              | Accepted                                                                 |
| [0029](0029-admin-shell-authorization.md)          | Admin shell, staff idle timeout, audit context  | Accepted                                                                 |
