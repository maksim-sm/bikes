"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, TextAreaField, TextField } from "@/ui";
import styles from "../../admin.module.css";
import {
  cancelOrderAction,
  completeOrderAction,
  refundPaymentAction,
  updateStaffNotesAction,
  type OrderFormState,
} from "./actions";

function FormStatus({ state }: { state: NonNullable<OrderFormState> }) {
  return (
    <p className={state.ok ? styles.success : styles.error} role="status">
      {state.message}
    </p>
  );
}

export function CompleteOrderForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(
    completeOrderAction,
    null,
  );
  return (
    <form action={action} className={styles.form}>
      <h2>{t.admin.completeOrder}</h2>
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.admin.completeSubmit}
      </Button>
      {state ? <FormStatus state={state} /> : null}
    </form>
  );
}

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(
    cancelOrderAction,
    null,
  );
  return (
    <form action={action} className={styles.form}>
      <h2>{t.admin.cancelOrder}</h2>
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" disabled={pending}>
        {t.admin.cancelSubmit}
      </Button>
      {state ? <FormStatus state={state} /> : null}
    </form>
  );
}

export function StaffNotesForm({ orderId, notes }: { orderId: string; notes: string }) {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(
    updateStaffNotesAction,
    null,
  );
  return (
    <form action={action} className={styles.form}>
      <h2>{t.admin.staffNotes}</h2>
      <p className={styles.hint}>{t.admin.staffNotesLead}</p>
      <input type="hidden" name="orderId" value={orderId} />
      <TextAreaField
        name="staffNotes"
        label={t.admin.staffNotes}
        defaultValue={notes}
        optionalLabel={t.form.optional}
        rows={4}
      />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.admin.saveNotes}
      </Button>
      {state ? <FormStatus state={state} /> : null}
    </form>
  );
}

export function RefundPaymentForm({
  paymentId,
  defaultAmount,
}: {
  paymentId: string;
  defaultAmount: string;
}) {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(
    refundPaymentAction,
    null,
  );
  return (
    <form action={action} className={styles.form}>
      <h3>{t.admin.refundTitle}</h3>
      <p className={styles.hint}>{t.admin.refundLead}</p>
      <input type="hidden" name="paymentId" value={paymentId} />
      <TextField
        name="amountByn"
        label={t.admin.refundAmount}
        defaultValue={defaultAmount}
        required
        inputMode="decimal"
      />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.admin.refundSubmit}
      </Button>
      {state ? <FormStatus state={state} /> : null}
    </form>
  );
}
