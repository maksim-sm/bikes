import type { Metadata, Route } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getCatalogServices } from "@/app/api/_lib/compose";
import { Breadcrumbs, storefrontCrumbs } from "@/app/_lib/seo/breadcrumbs";
import {
  bicycleTypePathSlug,
  catalogLandingPath,
  resolveCatalogSeo,
  type CatalogPathKind,
  type CatalogSearchParams,
  type CatalogSeoDecision,
} from "@/app/_lib/seo/facets";
import { JsonLd } from "@/app/_lib/seo/json-ld";
import { noIndexRobots, publicPageMetadata } from "@/app/_lib/seo/metadata";
import { catalogItemListJsonLd, imageAlt } from "@/app/_lib/seo/schema";
import { interpolate, formatPrice, t } from "@/lib/i18n";
import {
  BICYCLE_TYPES,
  lowestListPriceMinor,
  type Brand,
  type Category,
} from "@/modules/catalog";
import { mediaSrc } from "@/modules/media";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Container,
  Grid,
  Stack,
  TextLink,
  cardLinkOverlayClass,
} from "@/ui";
import { MediaImage } from "../../_lib/media-image";
import styles from "../catalog.module.css";

export function catalogLandingCopy(
  decision: CatalogSeoDecision,
  names: { categoryName?: string; brandName?: string },
): { title: string; description: string } {
  if (decision.pathKind === "category" && names.categoryName) {
    return {
      title: interpolate(t.catalog.categoryTitle, { name: names.categoryName }),
      description: interpolate(t.catalog.categoryDescription, {
        name: names.categoryName,
      }),
    };
  }
  if (decision.pathKind === "brand" && names.brandName) {
    return {
      title: interpolate(t.catalog.brandTitle, { name: names.brandName }),
      description: interpolate(t.catalog.brandDescription, { name: names.brandName }),
    };
  }
  if (decision.pathKind === "type" && decision.filters.bicycleType) {
    const name = t.catalog.typeLanding[decision.filters.bicycleType];
    return {
      title: interpolate(t.catalog.typeTitle, { name }),
      description: interpolate(t.catalog.typeDescription, { name }),
    };
  }
  return { title: t.catalog.title, description: t.catalog.description };
}

async function resolveNamedLanding(decision: CatalogSeoDecision): Promise<{
  categories: Category[];
  brands: Brand[];
  categoryName?: string;
  brandName?: string;
  missingLanding: boolean;
}> {
  const catalog = await getCatalogServices();
  const [categories, brands] = await Promise.all([
    catalog.listCategories(),
    catalog.listBrands(),
  ]);
  const category = categories.find((item) => item.slug === decision.landingSlug);
  const brand = brands.find((item) => item.slug === decision.landingSlug);
  const missingLanding =
    (decision.pathKind === "category" && !category) ||
    (decision.pathKind === "brand" && !brand);
  return {
    categories,
    brands,
    missingLanding,
    ...(category ? { categoryName: category.name } : {}),
    ...(brand ? { brandName: brand.name } : {}),
  };
}

export async function catalogGenerateMetadata(input: {
  pathKind: CatalogPathKind;
  pathSlug?: string;
  searchParams?: CatalogSearchParams;
}): Promise<Metadata> {
  const decision = resolveCatalogSeo(input);
  if (decision.invalidPath) {
    return { title: t.meta.notFoundTitle, robots: noIndexRobots };
  }
  const names = await resolveNamedLanding(decision);
  if (names.missingLanding) {
    return { title: t.meta.notFoundTitle, robots: noIndexRobots };
  }
  const copy = catalogLandingCopy(decision, names);
  return publicPageMetadata({
    title: copy.title,
    description: copy.description,
    path: decision.canonicalPath,
    robots: decision.robots,
  });
}

export async function CatalogRoutePage(input: {
  pathKind: CatalogPathKind;
  pathSlug?: string;
  searchParams?: CatalogSearchParams;
}) {
  const decision = resolveCatalogSeo(input);
  if (decision.invalidPath) {
    notFound();
  }
  if (decision.redirectTo) {
    permanentRedirect(decision.redirectTo as Route);
  }

  const catalog = await getCatalogServices();
  const [list, names] = await Promise.all([
    catalog.listPublishedProducts({
      page: decision.page,
      pageSize: 24,
      sort: decision.sort,
      filters: decision.filters,
    }),
    resolveNamedLanding(decision),
  ]);
  if (names.missingLanding) {
    notFound();
  }
  const copy = catalogLandingCopy(decision, names);
  const crumbs =
    decision.pathKind === "catalog"
      ? storefrontCrumbs({ name: t.catalog.title, path: "/catalog" })
      : storefrontCrumbs(
          { name: t.catalog.title, path: "/catalog" },
          { name: copy.title, path: decision.canonicalPath },
        );

  return (
    <Container>
      <div className={styles.page}>
        <JsonLd
          data={catalogItemListJsonLd(list.items, {
            name: copy.title,
            description: copy.description,
            path: decision.canonicalPath,
          })}
        />
        <Stack space={5}>
          <Breadcrumbs items={crumbs} />
          <h1>{copy.title}</h1>
          <p className={styles.lead ?? ""}>{copy.description}</p>
          <CatalogFacets
            decision={decision}
            categories={names.categories}
            brands={names.brands}
          />
          {list.items.length === 0 ? (
            <p className={styles.lead ?? ""}>{t.status.empty}</p>
          ) : (
            <Grid minColumnWidth="16rem" space={5} as="ul" className={styles.list ?? ""}>
              {list.items.map((product) => {
                const price = lowestListPriceMinor(product);
                const image = [...product.images].sort(
                  (left, right) => left.sortOrder - right.sortOrder,
                )[0];
                return (
                  <li key={product.id}>
                    <Card interactive>
                      <CardBody>
                        <Stack space={3}>
                          {image ? (
                            <MediaImage
                              src={mediaSrc(image.key)}
                              alt={imageAlt({
                                alt: image.alt,
                                brandName: product.brandName,
                                name: product.name,
                              })}
                            />
                          ) : null}
                          <p>{product.brandName}</p>
                          <CardTitle as="h2">{product.name}</CardTitle>
                          {price !== null ? (
                            <p className={styles.price ?? ""}>
                              {t.catalog.fromPrice} {formatPrice(price)}
                            </p>
                          ) : null}
                        </Stack>
                      </CardBody>
                      <CardFooter>
                        <ButtonLink
                          href={`/products/${product.slug}`}
                          variant="secondary"
                          className={cardLinkOverlayClass}
                        >
                          {t.catalog.openProduct}
                        </ButtonLink>
                      </CardFooter>
                    </Card>
                  </li>
                );
              })}
            </Grid>
          )}
        </Stack>
      </div>
    </Container>
  );
}

function CatalogFacets({
  decision,
  categories,
  brands,
}: {
  decision: CatalogSeoDecision;
  categories: readonly Category[];
  brands: readonly Brand[];
}) {
  const landingPath = decision.canonicalPath;
  const showReset = decision.kind === "utility" || decision.pathKind !== "catalog";

  return (
    <div className={styles.toolbar ?? ""}>
      <nav aria-label={t.catalog.facets} className={styles.facets ?? ""}>
        <FacetGroup
          title={t.catalog.facetCategory}
          allHref={decision.pathKind === "category" ? "/catalog" : landingPath}
          allCurrent={decision.pathKind !== "category"}
          items={[...categories]
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((category) => ({
              href: catalogLandingPath("category", category.slug),
              label: category.name,
              current:
                decision.pathKind === "category" &&
                decision.landingSlug === category.slug,
            }))}
        />
        <FacetGroup
          title={t.catalog.facetBrand}
          allHref={decision.pathKind === "brand" ? "/catalog" : landingPath}
          allCurrent={decision.pathKind !== "brand"}
          items={brands.map((brand) => ({
            href: catalogLandingPath("brand", brand.slug),
            label: brand.name,
            current: decision.pathKind === "brand" && decision.landingSlug === brand.slug,
          }))}
        />
        <FacetGroup
          title={t.catalog.facetType}
          allHref={decision.pathKind === "type" ? "/catalog" : landingPath}
          allCurrent={decision.pathKind !== "type"}
          items={BICYCLE_TYPES.map((type) => ({
            href: catalogLandingPath("type", bicycleTypePathSlug(type)),
            label: t.bicycleType[type],
            current:
              decision.pathKind === "type" && decision.filters.bicycleType === type,
          }))}
        />
      </nav>
      <div className={styles.utilities ?? ""}>
        <form method="get" action={landingPath} className={styles.search ?? ""}>
          <label className={styles.searchLabel ?? ""} htmlFor="catalog-q">
            {t.catalog.searchLabel}
          </label>
          <input
            id="catalog-q"
            name="q"
            type="search"
            defaultValue={decision.filters.q ?? ""}
            className={styles.searchInput ?? ""}
          />
          <Button type="submit" size="small">
            {t.actions.search}
          </Button>
        </form>
        <TextLink
          href={
            decision.filters.available ? landingPath : `${landingPath}?available=true`
          }
          rel="nofollow"
          subtle
        >
          {t.catalog.facetAvailable}
        </TextLink>
        {showReset ? (
          <TextLink href="/catalog" subtle>
            {t.catalog.resetFilters}
          </TextLink>
        ) : null}
      </div>
    </div>
  );
}

function FacetGroup({
  title,
  allHref,
  allCurrent,
  items,
}: {
  title: string;
  allHref: string;
  allCurrent: boolean;
  items: readonly { href: string; label: string; current: boolean }[];
}) {
  return (
    <div>
      <p className={styles.facetTitle ?? ""}>{title}</p>
      <ul className={styles.facetList ?? ""}>
        <li>
          <FacetLink href={allHref} current={allCurrent}>
            {t.catalog.facetAll}
          </FacetLink>
        </li>
        {items.map((item) => (
          <li key={item.href}>
            <FacetLink href={item.href} current={item.current}>
              {item.label}
            </FacetLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FacetLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: string;
}) {
  if (current) {
    return (
      <span className={styles.facetCurrent ?? ""} aria-current="page">
        {children}
      </span>
    );
  }
  return (
    <TextLink href={href} subtle>
      {children}
    </TextLink>
  );
}
