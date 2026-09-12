import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { toPrincipalDto } from "@/app/api/_lib/auth";
import { withRoute } from "@/app/api/_lib/route";
import { getAuthServices } from "@/app/api/_lib/compose";
import { clientRateKey, usesSecureCookies } from "@/app/api/_lib/csrf";
import { mergeGuestCartForPrincipal } from "@/app/_lib/complete-login";
import {
  clearedGuestCartCookie,
  readGuestToken,
} from "@/app/(storefront)/_lib/guest-cart";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const dynamic = "force-dynamic";

export const POST = withRoute("public", async (ctx) => {
  const body = parseWithSchema(bodySchema, await ctx.request.json());
  const auth = await getAuthServices();
  const secureCookie = usesSecureCookies();
  const result = await auth.login({
    email: body.email,
    password: body.password,
    requestId: ctx.requestId,
    rateKey: clientRateKey(ctx.request, "login"),
    secureCookie,
  });
  const guestToken = readGuestToken(ctx.request.headers.get("cookie"));
  const merged = await mergeGuestCartForPrincipal(result.principal, guestToken);
  return {
    data: toPrincipalDto(result.principal),
    cookies: merged
      ? [result.cookie, clearedGuestCartCookie(secureCookie)]
      : [result.cookie],
  };
});
