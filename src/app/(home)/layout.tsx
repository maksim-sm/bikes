import type { ReactNode } from "react";
import { StorefrontChrome } from "../_shell/storefront-chrome";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return <StorefrontChrome>{children}</StorefrontChrome>;
}
