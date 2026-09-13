import { createHash } from "node:crypto";
import type { AbuseAction } from "./ports";

export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export function actionRateKey(action: string, ip: string): string {
  return `${action}:${ip}`;
}

export function clientRateKey(
  request: { headers: { get(name: string): string | null } },
  action: string,
): string {
  return actionRateKey(action, clientIp(request.headers));
}

/** Short digest so rate keys never store a raw email. */
export function emailRatePart(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

export function abuseKey(action: AbuseAction, identities: readonly string[]): string {
  return [action, ...identities].join(":");
}
