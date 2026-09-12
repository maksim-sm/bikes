# Customer account area

Status: authoritative companion to ADR-0027.

Authenticated customers manage their own data at `/account`. Login and
registration live at `/login` and `/register`. Staff use `/admin`
(`docs/admin.md`).

## Surfaces

| Path                  | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `/login`              | Customer (or staff) sign-in                           |
| `/register`           | Create an account; email must be verified             |
| `/verify?token=`      | Confirm the mailed token                              |
| `/account`            | Overview                                              |
| `/account/profile`    | Name and phone                                        |
| `/account/addresses`  | Address book; one default                             |
| `/account/orders`     | Order history with payment and fulfillment status     |
| `/account/orders/:id` | Lines, totals, payment, delivery, staff-entered track |
| `/account/wishlist`   | Saved products; stock, deletion, and price flags      |
| `/account/security`   | Password change; logout all sessions                  |

The header **Личный кабинет** link goes to `/account` when signed in,
`/login` when anonymous, and `/admin` for staff.

## What the customer sees

- **Profile** — `firstName`, `lastName`, `phone`. Email is shown and is not
  editable here.
- **Addresses** — label, recipient, phone, Belarus region/city/street/index.
  The first address, or one marked default, is the single default.
- **Orders** — only rows with `userId` equal to the session. Guest checkouts
  do not appear. Payment status and fulfillment status are the projections
  already stored on the order.
- **Delivery** — fulfillment status always; shipment tracking (carrier,
  number, URL, times) when staff have assigned a shipment. Staff notes are
  not shown.
- **Wishlist** — products the customer saved. Out-of-stock, unpublished, and
  deleted rows stay visible with a flag. A price change is shown against the
  snapshot taken at add time. The same product cannot be added twice. See
  `docs/wishlist.md`.
- **Password change** — current password required. All other sessions are
  revoked; this browser receives a new cookie.
- **Logout all sessions** — `SessionRepository.revokeAllForUser`. The current
  cookie is cleared.

There is no carrier API and no payment-provider poll in the account area.
Statuses are the facts already on the order and shipment.

## Authorization

Pages call `requireCustomer`. HTTP writes use `customer_only`. Reads of
another customer's resources stay forbidden in the services (ADR-0017).
Order-management staff may still read any order through the existing order
GET; they do not use `/account`.

## Persistence

Local and test compose keep profiles, addresses, wishlists, and demo orders
in memory and seed a verified demo customer (`customer@bikes.local` /
`CustomerPass12`). Production uses Prisma for profiles, addresses,
wishlists, and order history.
