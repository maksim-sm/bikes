import type { Metadata } from "next";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.account.registerTitle,
};

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
