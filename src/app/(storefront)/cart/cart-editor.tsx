"use client";

import { useActionState } from "react";
import { formatPlural, formatPrice, interpolate, t } from "@/lib/i18n";
import type { CartLineView } from "@/modules/cart";
import { Button, SelectField } from "@/ui";
import {
  removeCartItemAction,
  replaceCartVariantAction,
  setCartQuantityAction,
  type CartActionState,
} from "./actions";
import styles from "./cart.module.css";

const QUANTITY_MAX = 10;
const quantities = Array.from({ length: QUANTITY_MAX }, (_, index) => index + 1);

function issueMessage(line: CartLineView): string | null {
  if (line.issues.includes("variant_missing")) {
    return t.cart.missing;
  }
  if (line.issues.includes("unavailable")) {
    return t.cart.unavailable;
  }
  if (line.issues.includes("insufficient_available")) {
    return interpolate(t.cartInsufficient, {
      units: formatPlural(line.available, t.plural.unitsLeft),
    });
  }
  return null;
}

function QuantityForm({ line }: { line: CartLineView }) {
  const [state, action, pending] = useActionState<CartActionState | null, FormData>(
    setCartQuantityAction,
    null,
  );
  return (
    <form action={action} className={styles.controls}>
      <input type="hidden" name="variantId" value={line.variantId} />
      <SelectField
        name="quantity"
        label={t.cart.quantity}
        defaultValue={String(line.quantity)}
        required
      >
        {quantities.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </SelectField>
      <Button type="submit" variant="secondary" size="small" disabled={pending}>
        {t.cart.update}
      </Button>
      {state ? (
        <p
          className={state.ok ? styles.success : styles.error}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function VariantForm({ line }: { line: CartLineView }) {
  const [state, action, pending] = useActionState<CartActionState | null, FormData>(
    replaceCartVariantAction,
    null,
  );
  const options = [
    {
      variantId: line.variantId,
      frameSize: line.frameSize ?? "",
      color: line.color ?? "",
      wheelSize: line.wheelSize ?? "",
      purchasable: line.purchasable,
    },
    ...line.alternatives.filter(
      (option) => option.purchasable || option.variantId === line.variantId,
    ),
  ];
  if (options.length < 2) {
    return null;
  }
  return (
    <form action={action} className={styles.controls}>
      <input type="hidden" name="fromVariantId" value={line.variantId} />
      <SelectField
        name="toVariantId"
        label={t.cart.variant}
        defaultValue={line.variantId}
        required
      >
        {options.map((option) => (
          <option key={option.variantId} value={option.variantId}>
            {option.frameSize}, {option.color}, {option.wheelSize}
          </option>
        ))}
      </SelectField>
      <Button type="submit" variant="secondary" size="small" disabled={pending}>
        {t.cart.update}
      </Button>
      {state ? (
        <p
          className={state.ok ? styles.success : styles.error}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function RemoveForm({ variantId }: { variantId: string }) {
  const [state, action, pending] = useActionState<CartActionState | null, FormData>(
    removeCartItemAction,
    null,
  );
  return (
    <form action={action}>
      <input type="hidden" name="variantId" value={variantId} />
      <Button type="submit" variant="danger" size="small" disabled={pending}>
        {t.cart.remove}
      </Button>
      {state && !state.ok ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function CartEditor({ items }: { items: CartLineView[] }) {
  return (
    <ul className={styles.list}>
      {items.map((line) => {
        const warning = issueMessage(line);
        return (
          <li key={line.variantId} className={styles.line}>
            <p>
              {line.brandName} {line.productName}
            </p>
            {line.frameSize ? (
              <p>
                {t.product.frameSize}: {line.frameSize}, {t.product.color}: {line.color}
                {line.wheelSize ? `, ${t.product.wheelSize}: ${line.wheelSize}` : ""}
              </p>
            ) : null}
            <p>
              {t.cart.unitPrice}: {formatPrice(line.unitPriceMinor)} · {t.cart.lineTotal}:{" "}
              {formatPrice(line.lineTotalMinor)}
            </p>
            {warning ? (
              <p className={styles.error} role="alert">
                {warning}
              </p>
            ) : null}
            <QuantityForm line={line} />
            <VariantForm line={line} />
            <RemoveForm variantId={line.variantId} />
          </li>
        );
      })}
    </ul>
  );
}
