# ADR-0029: Admin shell and staff session policy

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0016](0016-customer-authentication.md),
  [ADR-0017](0017-staff-authorization-roles.md)

## Context

`/admin` already had product and delivery pages with per-page guards. The
console still sat inside the storefront header, inventory staff were locked
out, sessions lasted 14 days for everyone, and `audit_logs` had no writer.

## Decision

1. **Dedicated admin chrome.** Admin routes do not render the storefront
   header or footer. They are `noindex`. Navigation is a role-filtered
   sidebar (catalog, deliveries, inventory).
2. **Route protection stays on the server.** A central `ADMIN_NAV` map
   decides which links appear. Each page still calls
   `requireCatalogRole` / `requireOrderManagementRole` /
   `requireInventoryRole`. Services keep the same checks. Capability is
   never read from the URL alone.
3. **Any staff capability with a console surface may enter admin.**
   Inventory-only staff land on `/admin/inventory`. Missing capability on
   a typed URL goes to `/admin/forbidden`, not a silent 200.
4. **Staff session timeout.** Customers keep the 14-day absolute cookie
   (ADR-0016). Staff sessions expire after 30 minutes idle (`last_seen_at`)
   or 12 hours absolute, whichever comes first. `resolve` revokes an idle
   staff session.
5. **Audit context.** The `audit` module records append-only rows. The app
   boundary builds `{ actorUserId, requestId }` and passes it in. Admin
   product and shipment writes record an entry after the service succeeds.

## Alternatives considered

**Next.js middleware as the only guard.** Rejected: architecture §7
resolves the principal at the app boundary and passes it into services.
Middleware would hide that argument.

**One 14-day TTL for staff.** Rejected: a warehouse terminal must not stay
signed in for two weeks.

**Guest-visible admin nav.** Rejected: ADR-0017 already keeps staff titles
off the storefront.

## Consequences

- `auth_sessions.last_seen_at` is written on every staff `resolve`.
- `audit_logs.entity_id` is a varchar so demo catalogue ids can be logged.
- Inventory staff see a console home; stock mutations remain service calls
  until a later inventory UI lands.

## When to revisit

A chosen SSO that owns staff session lifetime. A requirement to show the
audit log in the console.
