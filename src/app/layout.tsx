import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Веломагазин",
  description: "Магазин велосипедов",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={env.APP_LOCALE}>
      <body>{children}</body>
    </html>
  );
}
