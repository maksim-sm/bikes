import type { Metadata } from "next";
import { CatalogRoutePage, catalogGenerateMetadata } from "./_lib/catalog-page";
import type { CatalogSearchParams } from "@/app/_lib/seo/facets";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return catalogGenerateMetadata({
    pathKind: "catalog",
    searchParams: await searchParams,
  });
}

export default async function CatalogPage({ searchParams }: PageProps) {
  return CatalogRoutePage({
    pathKind: "catalog",
    searchParams: await searchParams,
  });
}
