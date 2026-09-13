import type { Metadata } from "next";
import { CatalogRoutePage, catalogGenerateMetadata } from "../../_lib/catalog-page";
import type { CatalogSearchParams } from "@/app/_lib/seo/facets";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return catalogGenerateMetadata({
    pathKind: "brand",
    pathSlug: slug,
    searchParams: await searchParams,
  });
}

export default async function CatalogBrandPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  return CatalogRoutePage({
    pathKind: "brand",
    pathSlug: slug,
    searchParams: await searchParams,
  });
}
