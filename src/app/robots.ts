import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/app/_lib/seo/urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/account",
          "/account/",
          "/checkout",
          "/checkout/",
          "/cart",
          "/login",
          "/register",
          "/verify",
          "/api/",
          "/ui-kit",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(absoluteUrl("/")).host,
  };
}
