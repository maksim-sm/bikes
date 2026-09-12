import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { toPrincipalDto } from "@/app/api/_lib/auth";
import { withRoute } from "@/app/api/_lib/route";
import { getAuthServices } from "@/app/api/_lib/compose";
import { clientRateKey, usesSecureCookies } from "@/app/api/_lib/csrf";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const dynamic = "force-dynamic";

export const POST = withRoute("public", async (ctx) => {
  const body = parseWithSchema(bodySchema, await ctx.request.json());
  const auth = await getAuthServices();
  const result = await auth.login({
    email: body.email,
    password: body.password,
    requestId: ctx.requestId,
    rateKey: clientRateKey(ctx.request, "login"),
    secureCookie: usesSecureCookies(),
  });
  return {
    data: toPrincipalDto(result.principal),
    cookies: [result.cookie],
  };
});
