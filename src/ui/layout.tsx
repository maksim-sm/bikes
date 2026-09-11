import type { CSSProperties, ElementType, ReactNode } from "react";
import styles from "./layout.module.css";

type SpaceToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

function gap(space: SpaceToken): CSSProperties {
  return { gap: `var(--space-${space})` };
}

function join(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

interface ContainerProps {
  children: ReactNode;
  /** Narrow the container to a comfortable reading measure. */
  prose?: boolean;
  as?: ElementType;
  className?: string;
}

export function Container({
  children,
  prose = false,
  as: Tag = "div",
  className,
}: ContainerProps) {
  return (
    <Tag className={join(styles.container, prose && styles.containerProse, className)}>
      {children}
    </Tag>
  );
}

interface StackProps {
  children: ReactNode;
  /** Spacing token for the gap between children. Defaults to 4 (16px). */
  space?: SpaceToken;
  as?: ElementType;
  className?: string;
}

/** Vertical rhythm: the default way to space stacked content. */
export function Stack({ children, space = 4, as: Tag = "div", className }: StackProps) {
  return (
    <Tag className={join(styles.stack, className)} style={gap(space)}>
      {children}
    </Tag>
  );
}

interface ClusterProps {
  children: ReactNode;
  space?: SpaceToken;
  /** Horizontal distribution. `between` pushes the first and last apart. */
  justify?: "start" | "between" | "end";
  as?: ElementType;
  className?: string;
}

/** Horizontal group that wraps instead of overflowing on narrow screens. */
export function Cluster({
  children,
  space = 3,
  justify = "start",
  as: Tag = "div",
  className,
}: ClusterProps) {
  return (
    <Tag
      className={join(
        styles.cluster,
        justify === "between" && styles.clusterBetween,
        justify === "end" && styles.clusterEnd,
        className,
      )}
      style={gap(space)}
    >
      {children}
    </Tag>
  );
}

interface GridProps {
  children: ReactNode;
  space?: SpaceToken;
  /** Minimum column width before the grid wraps to fewer columns. */
  minColumnWidth?: string;
  as?: ElementType;
  className?: string;
}

/**
 * Responsive grid with no breakpoints: columns wrap when they no longer fit.
 * One column on a phone, several on a desktop, without a media query.
 */
export function Grid({
  children,
  space = 4,
  minColumnWidth = "16rem",
  as: Tag = "div",
  className,
}: GridProps) {
  return (
    <Tag
      className={join(styles.grid, className)}
      style={{ ...gap(space), "--grid-min": minColumnWidth } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Visible to screen readers only. */
export function VisuallyHidden({
  children,
  as: Tag = "span",
}: {
  children: ReactNode;
  as?: ElementType;
}) {
  return <Tag className={styles.visuallyHidden}>{children}</Tag>;
}

/**
 * Keyboard users land here first and can jump past the header. Place it as the
 * first focusable element in the document.
 */
export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={styles.skipLink} href={href}>
      {children}
    </a>
  );
}
