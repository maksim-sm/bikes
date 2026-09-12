import { z } from "zod";
import { parseFilters, parseWithSchema, searchParamsObject } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getDeliveryServices } from "@/app/api/_lib/compose";

export const dynamic = "force-dynamic";

const QUOTE_FILTER_KEYS = ["region", "city"] as const;

const quoteQuerySchema = z.object({
  region: z.string().min(1),
  city: z.string().min(1),
});

export const GET = withRoute("public", async (ctx) => {
  const filters = parseFilters(searchParamsObject(ctx.url), QUOTE_FILTER_KEYS);
  const query = parseWithSchema(quoteQuerySchema, filters);
  const quotes = await getDeliveryServices().listQuotes({
    region: query.region,
    city: query.city,
  });
  return {
    data: {
      quotes: quotes.map((quote) => ({
        methodCode: quote.methodCode,
        methodName: quote.methodName,
        costMinor: quote.costMinor,
        estimatedDays: quote.estimatedDays,
        kind: quote.kind,
        pickup: quote.pickup,
      })),
    },
  };
});
