import type { Metadata } from "next";
import {
  CatalogRoutePage,
  catalogGenerateMetadata,
  catalogPageDynamic,
} from "../../_lib/catalog-page";
import type { CatalogSearchParams } from "@/app/_lib/seo/facets";

export const dynamic = catalogPageDynamic;

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
    pathKind: "category",
    pathSlug: slug,
    searchParams: await searchParams,
  });
}

export default async function CatalogCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  return CatalogRoutePage({
    pathKind: "category",
    pathSlug: slug,
    searchParams: await searchParams,
  });
}
