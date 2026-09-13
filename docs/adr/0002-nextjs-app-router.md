# ADR-0002: Next.js App Router as the application framework

- Status: Accepted (amended by [ADR-0035](0035-technical-seo.md), [ADR-0036](0036-faceted-navigation-seo.md))
- Date: 2026-09-11

## Context

The storefront's commercial value depends heavily on organic search: people
search for bicycle models and specifications, and product pages must be indexed
with their real content. The same application also needs an authenticated
customer area and a staff admin area, where SEO is irrelevant and interactivity
matters more. The team is small, so one framework must serve both.

## Decision

Use **Next.js with the App Router**, in TypeScript, as the single framework for
storefront, account area, and admin. React Server Components are the default for
reading data; server actions handle mutations from our own UI; route handlers
exist only for webhooks and other non-UI callers.

The framework occupies the `app/` layer only. Per `docs/architecture.md`, it
never accesses the database directly and holds no domain logic.

## Alternatives considered

**A React SPA (Vite) with a separate API server.** Rejected: client-rendered
product pages are a persistent SEO liability for a catalogue-driven retailer,
and it doubles the surface — two builds, two deployments, and a hand-written API
layer that exists only to serve our own frontend.

**Remix / React Router framework mode.** A genuinely close call with comparable
server-rendering quality and arguably a cleaner data model. Rejected on
ecosystem depth and the volume of available reference material rather than on
technical merit.

**Astro.** Excellent for the catalogue, weaker for the stateful cart, checkout,
and admin interfaces, which would push us toward islands plus a second approach
for interactive areas.

**A server-rendered non-JavaScript stack** (Django, Rails, Laravel). Strong
ecommerce precedent, but it splits the team's language across server and client
and discards the shared TypeScript types between domain modules and UI that make
a modular monolith pleasant to refactor.

## Reasons

- Server components render product content in the initial HTML, which is the
  requirement that actually drives revenue here.
- One framework, one language, one build covers all three areas of the site.
- Server actions remove the need to hand-write an internal API purely for our
  own forms, which is why ADR-0001's structure can keep HTTP surface minimal.
- Shared TypeScript types flow from module services into components without a
  serialization boundary.
- Node 22.14.0 is installed and satisfies the framework's `>= 20.9.0` engine
  requirement, so no runtime change is needed.

## Consequences

- We accept a fast-moving framework. Version upgrades will require real work,
  and the App Router's caching semantics have changed materially between majors.
- Server components and server actions are easy to misuse in ways that leak
  domain logic into `app/`. The dependency rules in `docs/architecture.md` exist
  specifically to counter this, and reviewers must apply them.
- Server actions are public HTTP endpoints despite looking like function calls.
  They receive the same input validation and authorization as route handlers;
  this is stated in the security rules because it is the most common Next.js
  security mistake.
- Some hosting platforms support Next.js better than others, which constrains
  the still-open deployment decision.

## When to revisit

- The framework's release cadence or breaking-change rate consumes maintenance
  capacity disproportionate to the features delivered.
- The storefront's server-rendering needs diverge so far from the admin area's
  that one framework genuinely cannot serve both well.
- A hosting constraint makes Next.js impractical on the chosen platform.

Difficulty with a specific caching behaviour is a reason to learn the caching
model, not to change framework.
