import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7).
 *
 * The connection URL lives here, not in schema.prisma. `prisma generate` must
 * not require a live database, so a missing DATABASE_URL falls back to the
 * local development URL rather than throwing.
 */
const databaseUrl =
  process.env["DATABASE_URL"] ?? "postgresql://bikes:bikes@localhost:5432/bikes";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
