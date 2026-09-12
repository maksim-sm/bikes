# Admin shell

Status: authoritative companion to ADR-0029.

Staff work under `/admin`. The storefront header is not shown. Pages are
excluded from indexing.

## Surfaces

| Path                  | Capability           | Purpose                                       |
| --------------------- | -------------------- | --------------------------------------------- |
| `/admin/login`        | —                    | Staff sign-in                                 |
| `/admin`              | any admin capability | Redirect to the role-appropriate home         |
| `/admin/products`     | `manage_catalog`     | Catalogue list                                |
| `/admin/products/new` | `manage_catalog`     | Create a bicycle                              |
| `/admin/products/:id` | `manage_catalog`     | Edit, publish, unpublish                      |
| `/admin/deliveries`   | `manage_orders`      | Methods, assign, tracking, ship, deliver      |
| `/admin/inventory`    | `manage_inventory`   | Warehouse entry (operations stay in services) |
| `/admin/forbidden`    | signed-in staff      | Wrong capability for the requested page       |

Demo staff: `staff@bikes.local` / `StaffPass12` (admin title).

## Authorization

Guards run on the server in the console layout and on each page. The same
`require*` helpers used by HTTP (`withRoute` policies) run again inside
catalog, delivery, and inventory services. A path is not a permission.

Navigation is filtered by `ADMIN_NAV` in `src/app/admin/_lib/access.ts`.
Inventory-only staff see only Склад. Order clerks see only Доставка.

## Session timeout

Customer cookies still last 14 days. Staff cookies last at most 12 hours
and die after 30 minutes without a server-side `resolve` (the console
touches `last_seen_at` on each request). An idle staff token resolves as
anonymous and the row is revoked.

## Audit context

Admin writes pass `{ actorUserId, requestId }` into `audit.record` after
the domain service succeeds. Rows live in `audit_logs`. The console does
not yet list them.
