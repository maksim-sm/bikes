# ADR-0011: CSS Modules with design tokens, not a utility framework

- Status: Accepted
- Date: 2026-09-11

## Context

The styling approach was the one item left open by the foundation work.
`docs/BASELINE.md` had provisionally recommended Tailwind 4.x, but nothing was
installed and the decision was never made.

The store needs a small, coherent visual system: typography, spacing, colour
with verified contrast, and a handful of primitives. It does not need a large
component library, and the team is small enough that consistency has to come
from constraint rather than from a design-system team.

## Decision

Use **plain CSS with custom properties for tokens, and CSS Modules for
component styles**. No CSS framework and no runtime CSS-in-JS.

- `src/ui/tokens.css` holds every token: type scale, spacing scale, colour,
  radii, shadow, breakpoint documentation, motion. A component that hardcodes a
  colour or a spacing value is a bug.
- `src/ui/base.css` holds the element-level reset and the single global focus
  style.
- Each component has a co-located `*.module.css`. Class names are locally
  scoped, so there is no cascade conflict and no naming convention to enforce.
- `src/ui/` is the design system's public entry point and is domain-agnostic:
  ESLint forbids it from importing `@/modules/*` or `@/app/*`.

## Alternatives considered

**Tailwind CSS 4.x**, the baseline's provisional recommendation. Genuinely
good, and the utility-first approach does prevent the cascade problems that
motivated it. Rejected for three reasons specific to this project: it adds a
build-tool dependency and a v3-to-v4 configuration model that most available
reference material still gets wrong; utility strings in markup make the
accessibility-critical parts of a component (focus rings, invalid states, touch
target sizes) much harder to review at a glance; and the constraint Tailwind
provides — a fixed scale — is exactly what the token file provides here without
the dependency.

**CSS-in-JS (styled-components, Emotion).** Rejected: runtime cost, and the
React Server Components model in ADR-0002 makes runtime styling libraries
awkward at best.

**A component library (MUI, Mantine, shadcn/ui).** Tempting for speed, and
their accessibility work is usually good. Rejected because the store needs
roughly eight primitives, not two hundred, and adopting a library means
inheriting its visual language and its upgrade treadmill for components we will
never use. shadcn/ui in particular would also pull in Radix and Tailwind.

**A single global stylesheet with BEM.** Rejected: relies entirely on naming
discipline to avoid collisions, which CSS Modules gives for free.

## Reasons

- Zero additional dependencies, which matters given ADR-0004's experience of
  version hazards in the dependency graph.
- CSS Modules are natively supported by the framework with no configuration.
- Tokens in one file make a change to the type or spacing scale a one-line
  edit, which is the actual benefit people want from a framework.
- Component CSS sits next to the component, so the focus, invalid, and disabled
  states are visible in review alongside the markup that triggers them.
- Native CSS features we rely on — custom properties, `:focus-visible`,
  container-free responsive grids via `auto-fill`/`minmax`, `dvh`, `accent-color`
  — are all available without tooling.

## Consequences

- More CSS is written by hand than with a utility framework, particularly for
  one-off layouts. The layout primitives in `src/ui/layout.tsx` exist to absorb
  most of that.
- Consistency depends on authors using tokens instead of literals. This is the
  main discipline cost, and it is enforced in review rather than by a linter
  today; a stylelint rule banning raw colour and length literals is the obvious
  future mitigation.
- No utility escape hatch, so a genuinely one-off style means adding a class to
  a module rather than a string in markup.
- Dark mode is not implemented. The token structure supports it — override the
  custom properties under a `prefers-color-scheme` block — but no dark palette
  has been designed or contrast-checked.

## When to revisit

- The team grows to the point where hand-written CSS becomes a consistency
  problem that review cannot absorb.
- A design requirement appears that needs a mature component primitive library
  — a combobox, a date picker, a complex data grid — where building it
  accessibly ourselves would be a poor use of effort. Adopting Radix primitives
  for those specific components would not require abandoning this decision.
- Style duplication across modules becomes measurable rather than anecdotal.

Finding a particular layout tedious to write is not a trigger.
