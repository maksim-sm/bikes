import type { ReactNode } from "react";
import { JsonLd } from "@/app/_lib/seo/json-ld";
import { organizationJsonLd } from "@/app/_lib/seo/schema";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function StorefrontChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
