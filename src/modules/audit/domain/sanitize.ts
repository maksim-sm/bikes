const SENSITIVE_KEY =
  /password|passwd|secret|token|cookie|authorization|session|card|pan|cvv|cvc|iban|providerpayload|rawbody|rawtoken|passwordhash/i;

export function isSensitiveAuditKey(key: string): boolean {
  return SENSITIVE_KEY.test(key.replaceAll("_", "").replaceAll("-", ""));
}

/**
 * Drops secrets and payment instrument fields before they hit `audit_logs`.
 * Amounts and payment *status* stay; PAN, CVV, tokens, and raw provider
 * bodies do not.
 */
export function sanitizeAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) =>
      isSensitiveAuditKey(key) ? [key, "[redacted]"] : [key, sanitizeAuditValue(item)],
    );
    return Object.fromEntries(entries);
  }
  if (typeof value === "string" && value.length > 400) {
    return value.slice(0, 400);
  }
  return value;
}
