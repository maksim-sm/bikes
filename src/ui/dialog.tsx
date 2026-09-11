"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import styles from "./dialog.module.css";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Action buttons, rendered right-aligned on wide screens and stacked on phones. */
  footer?: ReactNode;
  /** Accessible name for the close button, e.g. "Закрыть". */
  closeLabel: string;
}

/**
 * A modal dialog built on the native `<dialog>` element.
 *
 * `showModal()` gives us, from the browser and therefore correctly: focus
 * moved into the dialog, focus trapped while it is open, focus restored to the
 * trigger on close, Escape to dismiss, background content made inert, and
 * `role="dialog"` with `aria-modal`. We add only the accessible name via
 * `aria-labelledby` and a click-outside-to-close affordance.
 *
 * Do not replace this with a `<div>` overlay. Reimplementing a focus trap is
 * the single most common source of keyboard traps on the web.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  closeLabel,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      className={styles.dialog}
      ref={ref}
      // Fires on Escape as well as on `close()`, so parent state stays in sync.
      onClose={onClose}
      // Clicking the backdrop registers on the dialog element itself, since
      // all visible content sits inside `.inner`.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <button
            aria-label={closeLabel}
            className={styles.close}
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div>{children}</div>

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </dialog>
  );
}
