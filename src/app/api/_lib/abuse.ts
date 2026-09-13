import { headers } from "next/headers";
import { actionRateKey, assertAbuseLimit, clientIp, type AbuseAction } from "@/lib/abuse";
import { getAbuseLimiter } from "./compose";

export async function serverActionRateKey(action: string): Promise<string> {
  return actionRateKey(action, clientIp(await headers()));
}

export async function enforceAbuse(
  action: AbuseAction,
  request?: { headers: { get(name: string): string | null } },
): Promise<void> {
  const ip = request ? clientIp(request.headers) : clientIp(await headers());
  await assertAbuseLimit(getAbuseLimiter(), action, [ip]);
}
