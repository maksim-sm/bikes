# ADR-0015: Predictable HTTP via Route Handlers

- Status: Accepted
- Date: 2026-09-12
- Amends: architecture contract §6 (surfaces and rules)

## Context

The store is server-rendered. Architecture §6 forbade a speculative public
REST API so we would not grow a second, undocumented surface next to the
pages. External callers still exist: the deployment health check, payment
webhooks, and later third-party clients.

Application services now exist. If Route Handlers `JSON.stringify` a service
result, the HTTP contract becomes the internal object graph — fields appear
and disappear with refactors, and React is no longer the only consumer that
can be surprised.

We need one written contract for those handlers: envelope, validation, errors,
authn/authz, pagination, filtering, sorting, request ids, and logs.

## Decision

1. **Route Handlers are the only external HTTP contract.** They live under
   `src/app/api/**/route.ts`. Versioned resources use `/api/v1/`. Server
   components and server actions remain the UI path.
2. **Conventions are code in `src/lib/http` plus `withRoute` in `src/app/api/_lib`.**
   Handlers do not invent per-route envelopes. The document is `docs/api.md`.
3. **Responses are DTOs.** A handler maps service results field-by-field. It
   does not return a service object, a repository, or `...product`.
4. **Zod at the boundary.** Query, body, and path are parsed before a service
   is called. Unknown filter and sort keys fail validation.
5. **`AppError` → HTTP status happens only here.** Unexpected errors become
   `500 internal_error` with a generic message.
6. **Authentication is resolved once** into an identity `Principal` and passed
   inward. Authorization is a route policy (`public` / `customer` / `staff`)
   plus ownership checks inside services.
7. **Request ids and structured logs** are mandatory on every handler:
   incoming `X-Request-Id` or a generated UUID, echoed on the response, on
   the envelope, and on `http.request` / `http.response` / `http.error` lines.
   Webhook bodies are not logged.

The “do not build a speculative API” rule stands: a new Route Handler is
added when an external caller needs it, and it must use this contract.

## Alternatives considered

**Server actions as the external contract.** Rejected: they are not a stable
URL, they are awkward for webhooks and health checks, and they invite leaking
service types into the client bundle.

**Return domain objects as JSON.** Rejected: the catalogue `status` field, cart
ownership tokens, and payment provider ids are not a public schema.

**A separate Express/Fastify app.** Rejected under ADR-0001 and ADR-0002.

**GraphQL.** Rejected as a second query language nobody has asked for.

## Reasons

- Health checks and webhooks already require Route Handlers; conventions
  cost less than three ad-hoc shapes.
- Mapping to DTOs is what keeps the service layer testable and refactorable.
- Request ids are the cheapest way to reconstruct one failed checkout from
  logs (architecture §12).

## Consequences

- Every new `/api` file imports `withRoute` or justifies an exception (there
  is none today).
- The development bearer (`customer:<id>`, `staff:<id>`) is temporary. When
  cookie sessions land, only the session port changes.
- Catalogue list filtering/sorting currently runs in the HTTP adapter over
  `listPublishedProducts`. When a Prisma repository exists, the same query
  names can be pushed down to SQL without changing the URL contract.

## When to revisit

- A real session cookie replaces the development bearer.
- A second external consumer needs a resource that is not in `docs/api.md`.
- List queries are too large to filter in process.

Inventing a new envelope per handler is not a trigger.
