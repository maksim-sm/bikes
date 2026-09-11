/**
 * Design system — public entry point.
 *
 * `src/ui` holds presentation primitives with no domain knowledge: it must not
 * import from `@/modules/*`, and it must not know what a bicycle or an order
 * is. Anything domain-aware is a feature component and belongs with its
 * module or in `src/app`.
 */
export { Button } from "./button";
export type { ButtonProps, ButtonVariant } from "./button";

export { TextLink, ButtonLink } from "./link";
export type { TextLinkProps, ButtonLinkProps } from "./link";

export { Card, CardTitle, CardBody, CardFooter, cardLinkOverlayClass } from "./card";
export type { CardProps } from "./card";

export { Dialog } from "./dialog";
export type { DialogProps } from "./dialog";

export {
  TextField,
  TextAreaField,
  SelectField,
  Checkbox,
  Radio,
  FieldGroup,
} from "./field";
export type {
  TextFieldProps,
  TextAreaFieldProps,
  SelectFieldProps,
  CheckboxProps,
  RadioProps,
} from "./field";

export { Container, Stack, Cluster, Grid, VisuallyHidden, SkipLink } from "./layout";

export { breakpoints, minWidth } from "./breakpoints";
export type { Breakpoint } from "./breakpoints";
