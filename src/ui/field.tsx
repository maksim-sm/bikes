"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import styles from "./field.module.css";

interface FieldShellProps {
  label: string;
  /** Helper text shown below the label. Programmatically associated with the control. */
  hint?: string;
  /** Validation message. Its presence marks the control invalid. */
  error?: string;
  required?: boolean;
  /** Label for the optional marker, e.g. "необязательно". */
  optionalLabel?: string;
  children: (props: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
}

/**
 * The accessibility contract shared by every form control.
 *
 * A field is not just a label above a box. The label must be programmatically
 * associated with the control, hint and error text must be announced when the
 * control receives focus, and the invalid state must be exposed to assistive
 * technology rather than only drawn in red. This component owns all of that so
 * no individual form has to remember it.
 *
 * Errors use `role="alert"` so they are announced when they appear after
 * submission.
 */
function FieldShell({
  label,
  hint,
  error,
  required = false,
  optionalLabel,
  children,
}: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {!required && optionalLabel ? (
          <span className={styles.optional}>{optionalLabel}</span>
        ) : null}
      </label>

      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          <span aria-hidden="true" className={styles.errorMark}>
            !
          </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type FieldMeta = Pick<FieldShellProps, "label" | "hint" | "error" | "optionalLabel">;

export type TextFieldProps = FieldMeta &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">;

export function TextField({
  label,
  hint,
  error,
  optionalLabel,
  required,
  ...rest
}: TextFieldProps) {
  return (
    <FieldShell
      label={label}
      {...(hint === undefined ? {} : { hint })}
      {...(error === undefined ? {} : { error })}
      {...(optionalLabel === undefined ? {} : { optionalLabel })}
      {...(required === undefined ? {} : { required })}
    >
      {({ id, describedBy, invalid }) => (
        <input
          className={styles.control}
          id={id}
          required={required ?? false}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export type TextAreaFieldProps = FieldMeta &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className">;

export function TextAreaField({
  label,
  hint,
  error,
  optionalLabel,
  required,
  ...rest
}: TextAreaFieldProps) {
  return (
    <FieldShell
      label={label}
      {...(hint === undefined ? {} : { hint })}
      {...(error === undefined ? {} : { error })}
      {...(optionalLabel === undefined ? {} : { optionalLabel })}
      {...(required === undefined ? {} : { required })}
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          className={`${styles.control} ${styles.textarea}`}
          id={id}
          required={required ?? false}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export type SelectFieldProps = FieldMeta &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className"> & {
    children: ReactNode;
  };

/**
 * A native `<select>`. Custom dropdowns are a large accessibility liability
 * and are not worth building until a requirement genuinely demands one.
 */
export function SelectField({
  label,
  hint,
  error,
  optionalLabel,
  required,
  children,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldShell
      label={label}
      {...(hint === undefined ? {} : { hint })}
      {...(error === undefined ? {} : { error })}
      {...(optionalLabel === undefined ? {} : { optionalLabel })}
      {...(required === undefined ? {} : { required })}
    >
      {({ id, describedBy, invalid }) => (
        <select
          className={`${styles.control} ${styles.select}`}
          id={id}
          required={required ?? false}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> & {
  label: ReactNode;
};

/** Label and control share a single hit target via the wrapping `<label>`. */
export function Checkbox({ label, id, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label className={styles.choice} htmlFor={inputId}>
      <input className={styles.choiceInput} id={inputId} type="checkbox" {...rest} />
      <span className={styles.choiceLabel}>{label}</span>
    </label>
  );
}

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> & {
  label: ReactNode;
};

export function Radio({ label, id, ...rest }: RadioProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label className={styles.choice} htmlFor={inputId}>
      <input className={styles.choiceInput} id={inputId} type="radio" {...rest} />
      <span className={styles.choiceLabel}>{label}</span>
    </label>
  );
}

/**
 * Groups related checkboxes or radios. A `<fieldset>` with a `<legend>` is how
 * a screen reader learns that "Самовывоз" and "Курьер" are answers to
 * "Способ доставки" rather than unrelated controls.
 */
export function FieldGroup({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      {children}
    </fieldset>
  );
}
