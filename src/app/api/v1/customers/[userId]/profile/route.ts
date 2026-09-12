import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getCustomerServices } from "@/app/api/_lib/compose";

export const dynamic = "force-dynamic";

export interface ProfileDto {
  firstName: string;
  lastName: string;
  phone: string | null;
}

function toDto(profile: {
  firstName: string;
  lastName: string;
  phone: string | null;
}): ProfileDto {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
  };
}

export const GET = withRoute("customer", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const profile = await getCustomerServices().getProfile(ctx.principal, userId);
  return { data: toDto(profile) };
});

const updateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().nullable(),
});

export const PATCH = withRoute("customer_only", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const body = parseWithSchema(updateSchema, await ctx.request.json());
  const profile = await getCustomerServices().updateProfile(ctx.principal, userId, body);
  return { data: toDto(profile) };
});
