import type { NextConfig } from "next";
import { STATIC_SECURITY_HEADERS } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  // Playwright starts a second `next dev` beside a local server. A separate
  // distDir keeps that instance's lock and cache out of `.next`.
  ...(process.env.BIKES_NEXT_DIST_DIR
    ? { distDir: process.env.BIKES_NEXT_DIST_DIR }
    : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: STATIC_SECURITY_HEADERS.map((header) => ({
          key: header.key,
          value: header.value,
        })),
      },
    ];
  },
};

export default nextConfig;
