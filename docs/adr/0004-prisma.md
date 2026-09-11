# ADR-0004: Prisma as the ORM, pinned to a stable release

- Status: Accepted
- Date: 2026-09-11

## Context

`docs/architecture.md` left the ORM choice open between Prisma and Drizzle. It
blocks the first migration and the `schema.ts`/repository files in every module,
so it has to be settled before data-layer work starts.

The baseline audit surfaced a version hazard: the `prisma` package's `latest`
npm dist-tag currently resolves to `8.0.0-rc.13`, a release candidate. The most
recent stable release is `7.10.0`, published under the `prev` tag. A plain
`pnpm add prisma` therefore installs a prerelease into the data layer.

## Decision

Use **Prisma** as the ORM, **pinned to the stable `7.10.0`** with an exact
version specifier (no `^` or `~`) for both `prisma` and `@prisma/client`.
Prereleases are not adopted; moving to the 8.x line happens deliberately, after
it reaches stable, in its own pull request.

Prisma is confined to module repositories. The generated client is instantiated
once in `lib/db.ts`. Prisma types do not appear in any module's public entry
point; repositories map them to the module's own domain types.

## Alternatives considered

**Drizzle ORM 0.45.2.** The stronger technical candidate in several respects:
SQL-shaped queries with no generated client, lighter runtime, no separate
codegen step, and a clean stable release with no version hazard. It was the
provisional lean in the architecture contract. Rejected on ecosystem maturity
and team-onboarding grounds — Prisma's schema language, migration workflow, and
documentation are more approachable for contributors new to the codebase, and
the `0.x` version line signals a faster rate of API change than we want
underneath every repository in the application.

**Query builder only (Kysely).** Excellent type safety, but leaves migrations
and schema management to be assembled separately. Rejected as more moving parts
for a small team.

**Raw SQL with a thin mapping layer.** Maximum control, and tempting given the
no-cross-module-joins rule already limits query complexity. Rejected: it puts
the burden of parameterisation discipline on every author, and the security
rules depend on parameterised access being the default rather than a habit.

## Reasons

- The declarative schema and generated migrations match the architecture's
  requirement that migrations be committed, reviewed, and applied as an explicit
  deployment step.
- Generated types give end-to-end type safety from schema to service without
  hand-written row interfaces.
- Query building is parameterised by construction, which supports the security
  rule prohibiting SQL string interpolation.
- Documentation and ecosystem depth lower the cost of onboarding a contributor,
  which for a team this size outweighs Drizzle's runtime advantages.

## Consequences

- **The version pin is load-bearing.** Because the `latest` tag points at a
  release candidate, any dependency update performed carelessly can pull a
  prerelease into the data layer. The exact pin and a note in the dependency
  policy exist specifically to prevent this.
- Prisma's schema lives in a single `prisma/schema.prisma` file, which does not
  naturally express the per-module `schema.ts` ownership described in
  `docs/architecture.md`. Ownership is therefore expressed by **grouping models
  under a clearly commented per-module section**, and the table-ownership rule
  is enforced by review rather than by file location. This is a real weakening
  of the boundary mechanism and the main cost of choosing Prisma over Drizzle.
- A code generation step is required after every schema change and in CI.
- The client adds meaningful runtime weight and cold-start cost compared with
  Drizzle, which matters if the eventual hosting target is serverless.
- Complex queries occasionally require escaping to raw SQL, which must still be
  parameterised.

## When to revisit

- The 8.x line reaches stable and offers something we need; upgrade
  deliberately, superseding only the version pin, not the ORM choice.
- Cold-start or bundle size becomes a measured problem on the chosen hosting
  platform.
- The single-schema-file limitation demonstrably fails to hold module ownership
  in practice — that is, table ownership violations start reaching production
  because reviewers cannot see them.
- Query patterns need SQL expressiveness that fights the client persistently
  rather than occasionally.
