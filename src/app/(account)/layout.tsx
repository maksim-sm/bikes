import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noIndexRobots } from "@/app/_lib/seo/metadata";
import { StorefrontChrome } from "../_shell/storefront-chrome";

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function AccountGroupLayout({ children }: { children: ReactNode }) {
  return <StorefrontChrome>{children}</StorefrontChrome>;
}
