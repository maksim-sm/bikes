import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/lib/config";
import { t } from "@/lib/i18n";
import { SkipLink } from "@/ui";
import { SiteFooter } from "./_shell/site-footer";
import { SiteHeader } from "./_shell/site-header";
import "@/ui/tokens.css";
import "@/ui/base.css";

export const metadata: Metadata = {
  title: {
    default: t.site.name,
    template: `%s — ${t.site.name}`,
  },
  description: t.site.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={env.APP_LOCALE}>
      <body>
        <SkipLink href="#main">{t.nav.skipToContent}</SkipLink>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
