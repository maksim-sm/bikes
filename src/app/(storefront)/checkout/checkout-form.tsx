"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { formatPrice, t } from "@/lib/i18n";
import { Button, FieldGroup, Radio, Stack, TextField } from "@/ui";
import { placeCheckoutAction, type CheckoutActionState } from "./actions";
import styles from "./checkout.module.css";

export interface CheckoutQuoteOption {
  methodCode: string;
  methodName: string;
  costMinor: number;
  estimatedDays: number;
}

export interface CheckoutLine {
  variantId: string;
  productName: string;
  brandName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

interface CheckoutFormProps {
  lines: CheckoutLine[];
  subtotalMinor: number;
  initialQuotes: CheckoutQuoteOption[];
  defaultRegion: string;
  defaultCity: string;
}

export function CheckoutForm({
  lines,
  subtotalMinor,
  initialQuotes,
  defaultRegion,
  defaultCity,
}: CheckoutFormProps) {
  const [state, action, pending] = useActionState<CheckoutActionState | null, FormData>(
    placeCheckoutAction,
    null,
  );
  const [region, setRegion] = useState(defaultRegion);
  const [city, setCity] = useState(defaultCity);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [methodCode, setMethodCode] = useState(initialQuotes[0]?.methodCode ?? "");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ region, city });
    void fetch(`/api/v1/delivery/quotes?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          data?: { quotes?: CheckoutQuoteOption[] };
        };
        if (!response.ok) {
          throw new Error("quote_failed");
        }
        return body.data?.quotes ?? [];
      })
      .then((next) => {
        setQuotes(next);
        setQuoteError(next.length === 0 ? t.checkout.noMethods : null);
        setMethodCode((current) =>
          next.some((quote) => quote.methodCode === current)
            ? current
            : (next[0]?.methodCode ?? ""),
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setQuotes([]);
        setMethodCode("");
        setQuoteError(t.checkout.quoteFailed);
      });
    return () => controller.abort();
  }, [region, city]);

  const selected = useMemo(
    () => quotes.find((quote) => quote.methodCode === methodCode) ?? null,
    [quotes, methodCode],
  );
  const previewTotal = selected ? subtotalMinor + selected.costMinor : null;

  return (
    <form action={action} className={styles.form}>
      <Stack space={6}>
        <section>
          <h2>{t.checkout.customer}</h2>
          <Stack space={4}>
            <TextField
              name="customerName"
              label={t.fields.name}
              required
              autoComplete="name"
            />
            <TextField
              name="customerEmail"
              type="email"
              label={t.fields.email}
              required
              autoComplete="email"
            />
            <TextField
              name="customerPhone"
              type="tel"
              label={t.fields.phone}
              required
              autoComplete="tel"
            />
          </Stack>
        </section>

        <section>
          <h2>{t.checkout.shipping}</h2>
          <Stack space={4}>
            <TextField
              name="recipientName"
              label={t.fields.recipient}
              required
              autoComplete="shipping name"
            />
            <TextField
              name="shippingPhone"
              type="tel"
              label={t.fields.phone}
              required
              autoComplete="shipping tel"
            />
            <TextField
              name="region"
              label={t.fields.region}
              required
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              autoComplete="shipping address-level1"
            />
            <TextField
              name="city"
              label={t.fields.city}
              required
              value={city}
              onChange={(event) => setCity(event.target.value)}
              autoComplete="shipping address-level2"
            />
            <TextField
              name="street"
              label={t.fields.street}
              required
              autoComplete="shipping street-address"
            />
            <TextField
              name="postalCode"
              label={t.fields.postalCode}
              required
              autoComplete="shipping postal-code"
            />
          </Stack>
        </section>

        <FieldGroup legend={t.fields.deliveryMethod}>
          {quotes.map((quote) => (
            <Radio
              key={quote.methodCode}
              name="deliveryMethodCode"
              value={quote.methodCode}
              checked={methodCode === quote.methodCode}
              onChange={() => setMethodCode(quote.methodCode)}
              required
              label={`${quote.methodName} — ${formatPrice(quote.costMinor)}`}
            />
          ))}
          {quoteError ? (
            <p className={styles.error} role="alert">
              {quoteError}
            </p>
          ) : null}
        </FieldGroup>

        <section className={styles.summary} aria-live="polite">
          <h2>{t.checkout.total}</h2>
          <ul className={styles.lines}>
            {lines.map((line) => (
              <li key={line.variantId}>
                {line.brandName} {line.productName} × {line.quantity} —{" "}
                {formatPrice(line.lineTotalMinor)}
              </li>
            ))}
          </ul>
          <p>
            {t.checkout.subtotal}: {formatPrice(subtotalMinor)}
          </p>
          <p>
            {t.checkout.delivery}: {selected ? formatPrice(selected.costMinor) : "—"}
          </p>
          <p className={styles.total}>
            {t.checkout.total}: {previewTotal !== null ? formatPrice(previewTotal) : "—"}
          </p>
          <p className={styles.note}>{t.checkout.previewNote}</p>
        </section>

        <div>
          <Button type="submit" variant="primary" disabled={pending || !methodCode}>
            {t.checkout.place}
          </Button>
        </div>
        {state && !state.ok ? (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        ) : null}
      </Stack>
    </form>
  );
}
