import NextLink from "next/link";
import type { ComponentProps, ReactNode } from "react";
import buttonStyles from "./button.module.css";
import styles from "./link.module.css";
import type { ButtonVariant } from "./button";

type NextLinkProps = ComponentProps<typeof NextLink>;

export interface TextLinkProps extends Omit<NextLinkProps, "children"> {
  children: ReactNode;
  /** Removes the underline. Only for navigation, where context identifies the link. */
  subtle?: boolean;
}

/**
 * An in-app link. Wraps `next/link` so routing stays client-side.
 *
 * Links navigate; buttons act. Using the wrong one breaks middle-click,
 * open-in-new-tab, and the way screen readers announce the control.
 */
export function TextLink({
  children,
  subtle = false,
  className,
  ...rest
}: TextLinkProps) {
  const classes = [styles.link, subtle && styles.subtle, className]
    .filter(Boolean)
    .join(" ");

  return (
    <NextLink className={classes} {...rest}>
      {children}
    </NextLink>
  );
}

export interface ButtonLinkProps extends Omit<NextLinkProps, "children"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "medium" | "small";
  fullWidth?: boolean;
}

/** Styled as a button, but a real anchor because it navigates. */
export function ButtonLink({
  children,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  className,
  ...rest
}: ButtonLinkProps) {
  const classes = [
    buttonStyles.button,
    buttonStyles[variant],
    size === "small" && buttonStyles.small,
    fullWidth && buttonStyles.fullWidth,
    styles.asButton,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <NextLink className={classes} {...rest}>
      {children}
    </NextLink>
  );
}
