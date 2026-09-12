# Admin shell

Status: authoritative companion to ADR-0029.

Staff work under `/admin`. The storefront header is not shown. Pages are
excluded from indexing.

## Surfaces

| Path                          | Capability           | Purpose                                      |
| ----------------------------- | -------------------- | -------------------------------------------- |
| `/admin/login`                | —                    | Staff sign-in                                |
| `/admin`                      | any admin capability | Redirect to the role-appropriate home        |
| `/admin/products`             | `manage_catalog`     | Catalogue list                               |
| `/admin/products/new`         | `manage_catalog`     | Create a bicycle                             |
| `/admin/products/:id`         | `manage_catalog`     | Edit, publish, unpublish                     |
| `/admin/orders`               | `manage_orders`      | Search, filters, status, payment, notes      |
| `/admin/orders/:id`           | `manage_orders`      | Contact, payments, refund, delivery, notes   |
| `/admin/deliveries`           | `manage_orders`      | Methods, assign, tracking, ship, deliver     |
| `/admin/inventory`            | `manage_inventory`   | Stock list, search, recent movements         |
| `/admin/inventory/:variantId` | `manage_inventory`   | Counters, receive / adjust / return, history |
| `/admin/customers`            | `read_any_customer`  | Customer lookup (access is audited)          |
| `/admin/staff`                | `admin`              | Staff titles                                 |
| `/admin/audit`                | `admin`              | Historical audit log                         |
| `/admin/forbidden`            | signed-in staff      | Wrong capability for the requested page      |

Demo staff: `staff@bikes.local` / `StaffPass12` (admin title).

## Authorization

Guards run on the server in the console layout and on each page. The same
`require*` helpers used by HTTP (`withRoute` policies) run again inside
catalog, delivery, and inventory services. A path is not a permission.

Navigation is filtered by `ADMIN_NAV` in `src/app/admin/_lib/access.ts`.
Inventory-only staff see only Склад. Order clerks see Заказы and Доставка
and land on `/admin/orders`.

`listStaffOrders` searches number, email, name, phone, SKU, and notes, then
optional status filters. Completing or cancelling a `PLACED` order, saving
`staffNotes`, and starting a refund all go through module services. Refunds
are allowed only on `SUCCEEDED` or `PARTIALLY_REFUNDED` attempts.

## Session timeout

Customer cookies still last 14 days. Staff cookies last at most 12 hours
and die after 30 minutes without a server-side `resolve` (the console
touches `last_seen_at` on each request). An idle staff token resolves as
anonymous and the row is revoked.

## Audit context

Admin writes pass `{ actorUserId, requestId }` into `audit.record` after
the domain service succeeds. `prepareAuditRecord` redacts secrets and
payment-instrument fields. Admins list the ledger at `/admin/audit`
(ADR-0032). Recorded families: product and price changes, stock
adjustments, order complete/cancel, refunds (status + amount), customer
access, delivery configuration, and staff role changes.

Inventory receive, adjust, and return also persist the actor and reason on
the movement row itself. Reservation-trigger movements (reserve, release,
expire, commit) have no staff actor. Catalogue names and SKUs are resolved
at the app boundary via `catalog.listAll()` — inventory staff do not need
`manage_catalog`, and catalog SQL never joins `inventory_items`.
