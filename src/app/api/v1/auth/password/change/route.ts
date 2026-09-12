import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getAuthServices } from "@/app/api/_lib/compose";
import { clientRateKey, usesSecureCookies } from "@/app/api/_lib/csrf";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  password: z.string().min(1),
});

export const POST = withRoute("customer_only", async (ctx) => {
  const body = parseWithSchema(bodySchema, await ctx.request.json());
  const result = await (
    await getAuthServices()
  ).changePassword({
    principal: ctx.principal,
    currentPassword: body.currentPassword,
    password: body.password,
    requestId: ctx.requestId,
    rateKey: clientRateKey(ctx.request, "password-change"),
    secureCookie: usesSecureCookies(),
  });
  return { data: { ok: true }, cookies: [result.cookie] };
});
