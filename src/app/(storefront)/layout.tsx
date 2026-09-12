import type { ReactNode } from "react";
import { StorefrontChrome } from "../_shell/storefront-chrome";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <StorefrontChrome>{children}</StorefrontChrome>;
}
