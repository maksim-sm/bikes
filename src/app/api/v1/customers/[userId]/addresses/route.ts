import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getCustomerServices } from "@/app/api/_lib/compose";
import type { Address } from "@/modules/identity";

export const dynamic = "force-dynamic";

export interface AddressDto {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  city: string;
  region: string;
  street: string;
  postalCode: string;
  isDefault: boolean;
}

export function toAddressDto(address: Address): AddressDto {
  return {
    id: address.id,
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    city: address.city,
    region: address.region,
    street: address.street,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
  };
}

export const GET = withRoute("customer", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const addresses = await getCustomerServices().listAddresses(ctx.principal, userId);
  return { data: addresses.map(toAddressDto) };
});

const addSchema = z.object({
  label: z.string().min(1),
  recipientName: z.string().min(1),
  phone: z.string().min(1),
  region: z.string().min(1),
  city: z.string().min(1),
  street: z.string().min(1),
  postalCode: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export const POST = withRoute("customer_only", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const body = parseWithSchema(addSchema, await ctx.request.json());
  const addresses = await getCustomerServices().addAddress(ctx.principal, userId, {
    ...body,
    countryCode: "BY",
    isDefault: body.isDefault ?? false,
  });
  return { data: addresses.map(toAddressDto), status: 201 };
});
