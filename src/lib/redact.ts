/**
 * Shared redaction for logs, audit, and error tracking.
 * Never emit passwords, session secrets, API keys, card data, CVV, or tokens.
 */
const SENSITIVE_KEY =
  /password|passwd|secret|token|cookie|authorization|session|apikey|api_key|card|pan|cvv|cvc|iban|providerpayload|rawbody|rawtoken|passwordhash|clientsecret|paymenttoken/i;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key.replaceAll("_", "").replaceAll("-", ""));
}

export function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) =>
        isSensitiveKey(key) ? [key, "[redacted]"] : [key, redactValue(item)],
      ),
    );
  }
  if (typeof value === "string" && value.length > 400) {
    return value.slice(0, 400);
  }
  return value;
}

export function redactContext(
  context: Record<string, unknown>,
): Record<string, unknown> {
  return redactValue(context) as Record<string, unknown>;
}
