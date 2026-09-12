"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, TextAreaField, TextField } from "@/ui";
import styles from "../../admin.module.css";
import {
  adjustStockAction,
  receiveStockAction,
  returnStockAction,
  type InventoryFormState,
} from "./actions";

export function ReceiveStockForm({ variantId }: { variantId: string }) {
  return (
    <StockWriteForm
      variantId={variantId}
      title={t.admin.receiveTitle}
      lead={t.admin.receiveLead}
      submit={t.admin.receiveSubmit}
      action={receiveStockAction}
    />
  );
}

export function AdjustStockForm({ variantId }: { variantId: string }) {
  return (
    <StockWriteForm
      variantId={variantId}
      title={t.admin.adjustTitle}
      lead={t.admin.adjustLead}
      submit={t.admin.adjustSubmit}
      action={adjustStockAction}
    />
  );
}

export function ReturnStockForm({ variantId }: { variantId: string }) {
  return (
    <StockWriteForm
      variantId={variantId}
      title={t.admin.returnTitle}
      lead={t.admin.returnLead}
      submit={t.admin.returnSubmit}
      action={returnStockAction}
    />
  );
}

function StockWriteForm({
  variantId,
  title,
  lead,
  submit,
  action,
}: {
  variantId: string;
  title: string;
  lead: string;
  submit: string;
  action: (
    previous: InventoryFormState,
    formData: FormData,
  ) => Promise<InventoryFormState>;
}) {
  const [state, formAction, pending] = useActionState<InventoryFormState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className={styles.form}>
      <h2>{title}</h2>
      <p className={styles.hint}>{lead}</p>
      <input type="hidden" name="variantId" value={variantId} />
      <TextField
        name="quantity"
        label={t.cart.quantity}
        required
        inputMode="numeric"
        autoComplete="off"
      />
      <TextAreaField name="reason" label={t.admin.reason} required rows={3} />
      <Button type="submit" variant="primary" disabled={pending}>
        {submit}
      </Button>
      {state ? (
        <p className={state.ok ? styles.success : styles.error} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
