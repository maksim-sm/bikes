import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    globals: false,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["lib/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "lib/i18n/ru.ts"],
      thresholds: {
        // Порог из плана (0.5): ≥ 90% строк для lib/.
        lines: 90,
      },
    },
  },
});
