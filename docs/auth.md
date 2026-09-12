# Authentication and authorization

Status: authoritative companion to ADR-0016 and ADR-0017.

## Principals

Resolved once per request from the `bikes_session` httpOnly cookie.

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
and orders. Inventory staff cannot. Order-management staff may read any
order. Admin and manager may read customer records for support.

The raw session token and password hashes never appear in JSON.
