import type { Metadata } from "next";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.admin.title,
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <main id="main">{children}</main>;
}
