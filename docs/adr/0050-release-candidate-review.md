# ADR-0050: Release candidate review

- Status: Accepted
- Date: 2026-09-13
- Amends: go-live wording in `docs/architecture.md` §15–16
- Companion: `docs/release-candidate-review.md`

## Context

Prompt FINAL asked whether the repository is genuinely ready for commercial
production. ADR-0049 already named `docs/pre-production-audit.md` as the
go-live gate at commit `647b635`. Main has since absorbed the remaining
ops, testing, and performance branches (`9ad77d5`). A green `next build`
and a green demo E2E suite are still not enough: customer, payment,
inventory, security, operational, and deployment paths need evidence.

There is no standalone Belarus launch checklist file in this repository.
The review synthesizes launch obligations from architecture §16, the
ASVS checklist, payment ADRs, delivery ADRs, i18n ADRs, and the legal
storefront.

## Decision

1. **`docs/release-candidate-review.md` is the 2026-09-13 re-validation**
   of the go-live gate against commit `9ad77d5`, including command
   evidence for lint, typecheck, unit, integration, E2E, production
   build, migration reproduce, and dependency audit.
2. **The verdict remains not commercially production ready.** Blockers
   B1–B5 from ADR-0049 are still present in compose and operations.
3. **This pull request does not change product behaviour** except
   ignoring Playwright/Next cache directories in ESLint so `pnpm lint`
   does not fail after a local E2E run.

## Alternatives considered

**Declare the shop ready because CI and `next build` are green.**
Rejected: those prove the demo/`bikes_test` stacks and compile, not
production payment, email, legal, hosting, or restore (ADR-0039,
ADR-0049).

**Close blockers in the same review PR.** Rejected: a payment adapter,
SMTP, counsel-reviewed legal text, hosting, and a restore drill are
separate decisions.

## Consequences

- Launch planning starts from the RC review and the pre-production
  audit together. Closing a blocker still requires amending both
  documents with a new SHA.
- Architecture §16 remains the list of business/hosting decisions.

## When to revisit

- Every BLOCKER is closed, or an ADR explicitly narrows the product
  (for example COD-only with payment HTTP routes disabled).
- Then supersede or amend `docs/release-candidate-review.md` with the
  new commit SHA.
