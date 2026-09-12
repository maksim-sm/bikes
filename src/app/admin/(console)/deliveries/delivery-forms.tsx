"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, SelectField, TextField } from "@/ui";
import styles from "../../admin.module.css";
import {
  assignShipmentAction,
  markShippedAction,
  type DeliveryFormState,
} from "./actions";

export interface DeliveryMethodOption {
  code: string;
  name: string;
}

export function AssignShipmentForm({ methods }: { methods: DeliveryMethodOption[] }) {
  const [state, action, pending] = useActionState<DeliveryFormState, FormData>(
    assignShipmentAction,
    null,
  );

  return (
    <form action={action} className={styles.form}>
      <h2>{t.admin.assignTitle}</h2>
      <p className={styles.hint}>{t.admin.assignLead}</p>
      <TextField name="orderId" label={t.admin.orderId} required autoComplete="off" />
      <SelectField name="methodCode" label={t.fields.deliveryMethod} required>
        {methods.map((method) => (
          <option key={method.code} value={method.code}>
            {method.name}
          </option>
        ))}
      </SelectField>
      <TextField name="costByn" label={t.admin.costByn} required inputMode="decimal" />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.admin.assignSubmit}
      </Button>
      {state ? <FormStatus state={state} /> : null}
    </form>
  );
}

export function MarkShippedForm() {
  const [state, action, pending] = useActionState<DeliveryFormState, FormData>(
    markShippedAction,
    null,
  );

  return (
    <form action={action} className={styles.form}>
      <h2>{t.admin.shipTitle}</h2>
      <TextField name="orderId" label={t.admin.orderId} required autoComplete="off" />
      <TextField
        name="trackingNumber"
        label={t.admin.trackingNumber}
        required
        autoComplete="off"
      />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.admin.shipSubmit}
      </Button>
      {state ? <FormStatus state={state} /> : null}
    </form>
  );
}

function FormStatus({ state }: { state: NonNullable<DeliveryFormState> }) {
  return (
    <p className={state.ok ? styles.success : styles.error} role="status">
      {state.message}
    </p>
  );
}
