import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/lib/config";
import { metaFor, resolveLocale, t } from "@/lib/i18n";
import { siteMetadata } from "@/lib/i18n/metadata";
import { SkipLink } from "@/ui";
import "@/ui/tokens.css";
import "@/ui/base.css";

export const metadata: Metadata = siteMetadata(resolveLocale(env.APP_LOCALE));

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={metaFor(resolveLocale(env.APP_LOCALE)).htmlLang} dir="ltr">
      <body>
        <SkipLink href="#main">{t.nav.skipToContent}</SkipLink>
        {children}
      </body>
    </html>
  );
}
