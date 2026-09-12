import { UnauthenticatedError, ValidationError } from "@/lib/errors";
import { withRoute } from "@/app/api/_lib/route";
import { getPaymentServices } from "@/app/api/_lib/compose";

export const dynamic = "force-dynamic";

function headerMap(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

export const POST = withRoute(
  "public",
  async (ctx) => {
    const rawBody = await ctx.request.text();
    try {
      const payment = await getPaymentServices().handleWebhook(
        rawBody,
        headerMap(ctx.request.headers),
      );
      return { data: { paymentId: payment.id, status: payment.status } };
    } catch (error) {
      if (error instanceof Error && error.message === "invalid_signature") {
        throw new UnauthenticatedError("invalid webhook signature");
      }
      if (error instanceof Error && error.message === "invalid_payload") {
        throw new ValidationError("webhook payload is invalid");
      }
      throw error;
    }
  },
  { csrf: false },
);
