# ADR-0017: Explicit staff roles and resource ownership

- Status: Accepted
- Date: 2026-09-12
- Amends: architecture §7 (binary `customer` / `staff`)
- Extends: [ADR-0015](0015-http-route-handler-contract.md) route policies

## Context

Broken access control is the failure mode where a customer id in the URL is
treated as a permission. The store also has four staff jobs that must not
share one “is staff” flag: a warehouse clerk must not read another customer’s
profile, and an order clerk must not receive stock.

Architecture §7 said to add a third role only when a real permission
diverges. That condition is now met.

## Decision

1. **Keep `users.role` as `CUSTOMER` | `STAFF`.** Staff job titles live in
   `user_staff_roles` (`admin`, `manager`, `inventory`, `order_management`).
   A staff user may hold more than one title.
2. **`Principal` carries those titles.** Customers have none. Authorization
   helpers in `identity` are the only place that maps titles to capabilities:
   - `admin` — every staff capability;
   - `manager` — orders, inventory, and reading customer records;
   - `inventory` — stock receipts and other inventory writes;
   - `order_management` — any order and shipment mutation.
3. **Route policies** are `public`, `anonymous`, `customer` (any signed-in
   user), `customer_only`, `staff`, `admin`, `manager`, `inventory`, and
   `order_management`. Coarse policy is not enough: services still receive
   the `Principal` and call `assertCanReadCustomerResource` /
   `assertCanReadOrder`.
4. **A customer never reads another customer’s** profile, address, wishlist,
   or order. Inventory staff cannot either. Order-management staff may read
   orders, not wishlists or profiles.

## Consequences

- HTTP handlers must pass `ctx.principal` into services. Passing a `userId`
  from the path without the principal is a defect.
- Existing “any staff may read any order” behaviour is gone. Staff need the
  order-management title (or admin/manager).
- Payment webhooks stay `public` and authenticate the provider, not a staff
  role.

## When to revisit

If a fifth staff job appears with a capability that is not a subset of
admin/manager/inventory/order-management. Do not add per-endpoint boolean
flags on `User`.
