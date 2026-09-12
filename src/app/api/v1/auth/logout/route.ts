import { SESSION_COOKIE_NAME, readCookieValue } from "@/modules/identity";
import { withRoute } from "@/app/api/_lib/route";
import { getAuthServices } from "@/app/api/_lib/compose";
import { usesSecureCookies } from "@/app/api/_lib/csrf";

export const dynamic = "force-dynamic";

export const POST = withRoute("public", async (ctx) => {
  const auth = await getAuthServices();
  const result = await auth.logout({
    rawToken: readCookieValue(ctx.request.headers.get("cookie"), SESSION_COOKIE_NAME),
    requestId: ctx.requestId,
    secureCookie: usesSecureCookies(),
  });
  return { data: { ok: true }, cookies: [result.cookie] };
});
