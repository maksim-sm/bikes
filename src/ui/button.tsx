import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "medium" | "small";
  fullWidth?: boolean;
}

/**
 * A real `<button>`, always.
 *
 * A styled `<div>` with an onClick handler is not keyboard operable, is not
 * announced as a button, and does not respond to Enter or Space. If an action
 * navigates, use `ButtonLink` instead so it gets link semantics and the
 * browser's open-in-new-tab behaviour.
 *
 * `type` defaults to "button" rather than the HTML default of "submit", so a
 * button placed in a form does not submit it by accident.
 */
export function Button({
  children,
  variant = "secondary",
  size = "medium",
  fullWidth = false,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    size === "small" && styles.small,
    fullWidth && styles.fullWidth,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...rest}>
      {children}
    </button>
  );
}
