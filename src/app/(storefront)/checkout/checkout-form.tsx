"use client";

import { useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import { formatPrice, t } from "@/lib/i18n";
import {
  Button,
  Card,
  Checkbox,
  FieldGroup,
  Radio,
  Stack,
  TextField,
  TextLink,
} from "@/ui";
import { placeCheckoutAction, type CheckoutActionState } from "./actions";
import { paymentMethodLabel } from "./payment-label";
import { validateCheckoutForm, type CheckoutFieldErrors } from "./validate";
import styles from "./checkout.module.css";

export interface CheckoutQuoteOption {
  methodCode: string;
  methodName: string;
  costMinor: number;
  estimatedDays: number;
  kind: "courier" | "pickup";
  pickup: {
    region: string;
    city: string;
    street: string;
    postalCode: string;
  } | null;
}

export interface CheckoutLine {
  variantId: string;
  productName: string;
  brandName: string;
  frameSize: string | null;
  color: string | null;
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

const PAYMENT_CODES = ["cash_on_delivery", "card_on_delivery", "bank_transfer"] as const;

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
  const [paymentCode, setPaymentCode] =
    useState<(typeof PAYMENT_CODES)[number]>("cash_on_delivery");
  const [sameRecipient, setSameRecipient] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [localFields, setLocalFields] = useState<CheckoutFieldErrors>({});

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
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
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [region, city]);

  const selected = useMemo(
    () => quotes.find((quote) => quote.methodCode === methodCode) ?? null,
    [quotes, methodCode],
  );
  const isPickup = selected?.kind === "pickup";
  const previewTotal = selected ? subtotalMinor + selected.costMinor : null;
  const fields = { ...localFields, ...state?.fields };

  function errorProp(name: keyof CheckoutFieldErrors) {
    const value = fields[name];
    return value === undefined ? {} : { error: value };
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = new FormData(form);
    const next = validateCheckoutForm({
      customerName: String(data.get("customerName") ?? ""),
      customerEmail: String(data.get("customerEmail") ?? ""),
      customerPhone: String(data.get("customerPhone") ?? ""),
      recipientName: sameRecipient
        ? String(data.get("customerName") ?? "")
        : String(data.get("recipientName") ?? ""),
      shippingPhone: sameRecipient
        ? String(data.get("customerPhone") ?? "")
        : String(data.get("shippingPhone") ?? ""),
      region,
      city,
      street: String(data.get("street") ?? ""),
      postalCode: String(data.get("postalCode") ?? ""),
      deliveryMethodCode: methodCode,
      paymentMethodCode: paymentCode,
      consent: data.get("consent") === "on",
      addressRequired: !isPickup,
    });
    setLocalFields(next);
    if (Object.keys(next).length > 0) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={onSubmit} className={styles.layout} noValidate>
      <Stack space={6}>
        <p className={styles.lead}>{t.checkout.guestLead}</p>
        {state && !state.ok ? (
          <p className={styles.banner} role="alert">
            {state.message}
          </p>
        ) : null}

        <section>
          <h2>{t.checkout.customer}</h2>
          <Stack space={4}>
            <TextField
              name="customerName"
              label={t.fields.name}
              required
              autoComplete="name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              {...errorProp("customerName")}
            />
            <TextField
              name="customerEmail"
              type="email"
              label={t.fields.email}
              required
              autoComplete="email"
              {...errorProp("customerEmail")}
            />
            <TextField
              name="customerPhone"
              type="tel"
              label={t.fields.phone}
              required
              autoComplete="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              {...errorProp("customerPhone")}
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
              label={deliveryLabel(quote)}
            />
          ))}
          {quoteError || fields.deliveryMethodCode ? (
            <p className={styles.error} role="alert">
              {quoteError ?? fields.deliveryMethodCode}
            </p>
          ) : null}
        </FieldGroup>

        <section>
          <h2>{isPickup ? t.checkout.pickup : t.checkout.shipping}</h2>
          <Stack space={4}>
            <TextField
              name="region"
              label={t.fields.region}
              required
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              autoComplete="shipping address-level1"
              {...errorProp("region")}
            />
            <TextField
              name="city"
              label={t.fields.city}
              required
              value={city}
              onChange={(event) => setCity(event.target.value)}
              autoComplete="shipping address-level2"
              {...errorProp("city")}
            />
            {isPickup ? (
              <div className={styles.pickup}>
                <p>
                  {t.checkout.pickupPoint}: {selected?.pickup?.street},{" "}
                  {selected?.pickup?.city}, {selected?.pickup?.postalCode}
                </p>
                <p className={styles.note}>{t.checkout.pickupHours}</p>
              </div>
            ) : (
              <>
                <Checkbox
                  name="sameRecipient"
                  checked={sameRecipient}
                  onChange={(event) => setSameRecipient(event.target.checked)}
                  label={t.checkout.sameRecipient}
                />
                {sameRecipient ? null : (
                  <>
                    <TextField
                      name="recipientName"
                      label={t.fields.recipient}
                      required
                      autoComplete="shipping name"
                      {...errorProp("recipientName")}
                    />
                    <TextField
                      name="shippingPhone"
                      type="tel"
                      label={t.fields.phone}
                      required
                      autoComplete="shipping tel"
                      {...errorProp("shippingPhone")}
                    />
                  </>
                )}
                <TextField
                  name="street"
                  label={t.fields.street}
                  required
                  autoComplete="shipping street-address"
                  {...errorProp("street")}
                />
                <TextField
                  name="postalCode"
                  label={t.fields.postalCode}
                  required
                  autoComplete="shipping postal-code"
                  {...errorProp("postalCode")}
                />
              </>
            )}
          </Stack>
        </section>

        <FieldGroup legend={t.checkout.payment}>
          <p className={styles.note}>{t.checkout.paymentHint}</p>
          {PAYMENT_CODES.map((code) => (
            <Radio
              key={code}
              name="paymentMethodCode"
              value={code}
              checked={paymentCode === code}
              onChange={() => setPaymentCode(code)}
              required
              label={paymentMethodLabel(code)}
            />
          ))}
          {fields.paymentMethodCode ? (
            <p className={styles.error} role="alert">
              {fields.paymentMethodCode}
            </p>
          ) : null}
        </FieldGroup>

        <div>
          <Checkbox name="consent" required label={t.checkout.consent} />
          <p className={styles.legal}>
            <TextLink href="/legal/terms">{t.checkout.consentTerms}</TextLink>{" "}
            {t.checkout.consentAnd}{" "}
            <TextLink href="/legal/privacy">{t.checkout.consentPrivacy}</TextLink>
          </p>
          {fields.consent ? (
            <p className={styles.error} role="alert">
              {fields.consent}
            </p>
          ) : null}
        </div>

        <div className={styles.submit}>
          <Button type="submit" variant="primary" disabled={pending || !methodCode}>
            {t.checkout.place}
          </Button>
        </div>
      </Stack>

      <aside className={styles.summary} aria-live="polite">
        <Card filled>
          <h2>{t.checkout.summary}</h2>
          <ul className={styles.lines}>
            {lines.map((line) => (
              <li key={line.variantId}>
                <span>
                  {line.brandName} {line.productName}
                  {line.frameSize
                    ? ` (${line.frameSize}, ${line.color ?? ""})`
                    : ""} × {line.quantity}
                </span>
                <span>{formatPrice(line.lineTotalMinor)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.row}>
            <span>{t.checkout.subtotal}</span>
            <span>{formatPrice(subtotalMinor)}</span>
          </p>
          <p className={styles.row}>
            <span>{t.checkout.delivery}</span>
            <span>{selected ? formatPrice(selected.costMinor) : "—"}</span>
          </p>
          <p className={styles.total}>
            <span>{t.checkout.total}</span>
            <span>{previewTotal !== null ? formatPrice(previewTotal) : "—"}</span>
          </p>
          <p className={styles.note}>{t.checkout.previewNote}</p>
        </Card>
      </aside>
    </form>
  );
}

function deliveryLabel(quote: CheckoutQuoteOption): string {
  const price = formatPrice(quote.costMinor);
  if (quote.kind === "pickup") {
    return `${quote.methodName} — ${price}. ${t.checkout.pickupReady}`;
  }
  return `${quote.methodName} — ${price}, ${quote.estimatedDays} ${t.checkout.deliveryDays}`;
}
