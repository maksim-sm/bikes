# ADR-0049: Pre-production technical audit

- Status: Accepted
- Date: 2026-09-13
- Amends: go-live wording in `docs/architecture.md` §15–16

## Context

Prompts 1–29 built the store, CI, deploy procedure, observability, and
failure-mode tests. Prompt 30.1 asked for a pre-production audit
without speculative code changes: classify every issue BLOCKER / HIGH /
MEDIUM / LOW, and do not declare production readiness if a blocker
remains.

`docs/BASELINE.md` audited an empty repository. `docs/security.md`
mapped ASVS L1. Neither is a go-live gate for the current compose.

## Decision

1. **`docs/pre-production-audit.md` is the go-live gate.** It reviews
   the listed surfaces against commit `647b635`.
2. **The verdict is not production ready.** Blockers: mock + in-memory
   payments, logging-only email, incomplete legal/seller content,
   unresolved hosting/seed, and no evidenced backup drill.
3. **This pull request does not change runtime behaviour.** Closing a
   blocker is a later, scoped change that amends the audit file.

## Alternatives considered

**Declare the shop ready because CI is green.** Rejected: CI proves
the demo and `bikes_test` stacks, not production compose (ADR-0039).

**Fix blockers in the same audit PR.** Rejected by the prompt
(no speculative changes) and by ADR size: a provider, SMTP, legal
text, and hosting are separate decisions.

## Consequences

- Launch checklists must start from the audit table, not from a green
  `CI` badge alone.
- Architecture §16 stays the list of business/hosting decisions; the
  audit names which of those still block a public shop.

## When to revisit

- Every BLOCKER is closed, or an ADR explicitly narrows the product
  (for example payment HTTP routes disabled until a provider exists).
- Then supersede or amend `docs/pre-production-audit.md` with a new
  SHA — do not silently edit away a blocker.
