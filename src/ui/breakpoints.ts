/**
 * Breakpoint values in pixels.
 *
 * Mobile-first: layouts are written for the narrow case and widen at
 * `min-width`. These duplicate the comments in `tokens.css` because CSS custom
 * properties cannot be used inside media queries — change both together.
 */
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** `min-width` media query string for a breakpoint, for use in CSS-in-JS or matchMedia. */
export function minWidth(breakpoint: Breakpoint): string {
  return `(min-width: ${breakpoints[breakpoint]}px)`;
}
