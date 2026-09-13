# Authentication and authorization

Status: authoritative companion to ADR-0016, ADR-0017, and ADR-0042.

## Principals

Resolved once per request from the session httpOnly cookie (`bikes_session` on
http, `__Host-bikes_session` on https; ADR-0041).

| `Principal.type` | Meaning                      |
| ---------------- | ---------------------------- |
| `anonymous`      | No valid session             |
| `customer`       | Verified customer account    |
| `staff`          | Staff account plus `roles[]` |

Staff titles: `admin`, `manager`, `inventory`, `order_management`. Helpers:
`requireAnonymous`, `requireCustomer`, `requireStaff`, `requireAdmin`,
`requireManager`, `requireInventoryRole`, `requireOrderManagementRole`,
`requireCatalogRole`, `assertCanReadCustomerResource`, `assertCanReadOrder`.

`manage_catalog` is a capability of admin and manager. Inventory-only staff
cannot create or publish products.

## Customer isolation

A customer may read and write only their own profile, addresses, wishlist,
and orders. There is no guest wishlist. Inventory staff cannot. Order-management
staff may read any order. Admin and manager may read customer records for
support.

The raw session token and password hashes never appear in JSON.

Login, registration, password reset, and admin login are rate-limited
through `src/lib/abuse` (IP plus a hashed email). Checkout, payment start,
and payment webhooks share the same port. The default backend is in-process
memory (ADR-0042).

Customer sessions last 14 days. Staff sessions last at most 12 hours and
end after 30 minutes without a server-side `resolve` (ADR-0029). The admin
console is described in `docs/admin.md`.

A signed-in customer may change their password (`POST /api/v1/auth/password/change`)
or revoke every session (`POST /api/v1/auth/logout-all`). Password change
issues a fresh cookie for the current browser. The account UI is described
in `docs/account.md`.
