import type { Metadata } from "next";
import { CatalogRoutePage, catalogGenerateMetadata } from "../../_lib/catalog-page";
import type { CatalogSearchParams } from "@/app/_lib/seo/facets";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { type } = await params;
  return catalogGenerateMetadata({
    pathKind: "type",
    pathSlug: type,
    searchParams: await searchParams,
  });
}

export default async function CatalogTypePage({ params, searchParams }: PageProps) {
  const { type } = await params;
  return CatalogRoutePage({
    pathKind: "type",
    pathSlug: type,
    searchParams: await searchParams,
  });
}
