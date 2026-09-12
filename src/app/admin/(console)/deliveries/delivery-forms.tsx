"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, SelectField, TextAreaField, TextField } from "@/ui";
import { toDateTimeLocal } from "../../_lib/datetime";
import styles from "../../admin.module.css";
import {
  assignShipmentAction,
  markDeliveredAction,
  markShippedAction,
  updateTrackingAction,
  type DeliveryFormState,
} from "./actions";

export interface DeliveryMethodOption {
  code: string;
  name: string;
}

export interface TrackingFormValues {
  orderId: string;
  carrierName: string;
  trackingNumber: string;
  trackingUrl: string;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  notes: string;
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

export function UpdateTrackingForm({ values }: { values: TrackingFormValues }) {
  const [state, action, pending] = useActionState<DeliveryFormState, FormData>(
    updateTrackingAction,
    null,
  );

  return (
    <form action={action} className={styles.form}>
      <h2>{t.admin.trackingTitle}</h2>
      <p className={styles.hint}>{t.admin.trackingLead}</p>
      <input type="hidden" name="orderId" value={values.orderId} />
      <TextField
        name="carrierName"
        label={t.admin.carrierName}
        defaultValue={values.carrierName}
        optionalLabel={t.form.optional}
        autoComplete="off"
      />
      <TextField
        name="trackingNumber"
        label={t.admin.trackingNumber}
        defaultValue={values.trackingNumber}
        optionalLabel={t.form.optional}
        autoComplete="off"
      />
      <TextField
        name="trackingUrl"
        type="url"
        label={t.admin.trackingUrl}
        defaultValue={values.trackingUrl}
        optionalLabel={t.form.optional}
        autoComplete="off"
      />
      <TextField
        name="shippedAt"
        type="datetime-local"
        label={t.admin.shippedAt}
        defaultValue={toDateTimeLocal(values.shippedAt)}
        optionalLabel={t.form.optional}
      />
      <TextField
        name="deliveredAt"
        type="datetime-local"
        label={t.admin.deliveredAt}
        defaultValue={toDateTimeLocal(values.deliveredAt)}
        optionalLabel={t.form.optional}
      />
      <TextAreaField
        name="notes"
        label={t.admin.deliveryNotes}
        defaultValue={values.notes}
        optionalLabel={t.form.optional}
        rows={4}
      />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.admin.trackingSubmit}
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
      <TextField
        name="carrierName"
        label={t.admin.carrierName}
        optionalLabel={t.form.optional}
        autoComplete="off"
      />
      <TextField
        name="trackingUrl"
        type="url"
        label={t.admin.trackingUrl}
        optionalLabel={t.form.optional}
        autoComplete="off"
      />
      <TextAreaField
        name="notes"
        label={t.admin.deliveryNotes}
        optionalLabel={t.form.optional}
        rows={3}
      />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.admin.shipSubmit}
      </Button>
      {state ? <FormStatus state={state} /> : null}
    </form>
  );
}

export function MarkDeliveredForm() {
  const [state, action, pending] = useActionState<DeliveryFormState, FormData>(
    markDeliveredAction,
    null,
  );

  return (
    <form action={action} className={styles.form}>
      <h2>{t.admin.deliverTitle}</h2>
      <TextField name="orderId" label={t.admin.orderId} required autoComplete="off" />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.admin.deliverSubmit}
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
