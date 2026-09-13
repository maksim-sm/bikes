import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

/**
 * Playwright drives the critical storefront and admin journeys.
 *
 * The suite talks to `next dev`, not `next start`. Compose serves the demo
 * catalog, identity, cart, orders, and payment fixture only when
 * `NODE_ENV !== "production"`. A production start against empty PostgreSQL
 * cannot browse, search, or log in as the demo customer or staff. Demo login
 * buttons are also compiled out of the client bundle in production, and
 * Secure cookies on `http://localhost` would never be stored (ADR-0039).
 *
 * Demo cart, inventory, and orders are process-global. Parallel workers would
 * share stock and carts, so this file stays sequential.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "ru-RU",
    timezoneId: "Europe/Minsk",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${String(port)}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
      APP_URL: baseURL,
      BIKES_NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
