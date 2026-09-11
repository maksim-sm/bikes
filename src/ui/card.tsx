import type { ElementType, ReactNode } from "react";
import styles from "./card.module.css";

export interface CardProps {
  children: ReactNode;
  /** Tinted background instead of a border. */
  filled?: boolean;
  /**
   * Marks the card as containing a primary link or button whose hit area is
   * stretched across it. Use with `CardLinkOverlay`.
   */
  interactive?: boolean;
  as?: ElementType;
  className?: string;
}

/**
 * A surface that groups related content.
 *
 * Deliberately not clickable itself. A clickable `<div>` cannot be focused or
 * activated from a keyboard; instead, put a real link inside and add
 * `CardLinkOverlay` to it so the whole card is a comfortable pointer target
 * while remaining a single, ordinary tab stop.
 */
export function Card({
  children,
  filled = false,
  interactive = false,
  as: Tag = "div",
  className,
}: CardProps) {
  const classes = [
    styles.card,
    filled && styles.filled,
    interactive && styles.interactive,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Tag className={classes}>{children}</Tag>;
}

export function CardTitle({
  children,
  as: Tag = "h3",
}: {
  children: ReactNode;
  as?: ElementType;
}) {
  return <Tag className={styles.title}>{children}</Tag>;
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
}

/**
 * Apply to the single link inside an interactive card to stretch its hit area
 * over the whole surface. The card's `:focus-within` ring then shows the
 * keyboard focus position.
 */
export const cardLinkOverlayClass = styles.stretchedTarget;
