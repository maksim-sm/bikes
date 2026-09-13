import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit",
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    passWithNoTests: false,
    allowOnly: !process.env.CI,
    env: {
      LOG_LEVEL: "error",
    },
  },
  resolve: {
    alias: {
      "@/app": path.resolve(__dirname, "src/app"),
      "@/modules": path.resolve(__dirname, "src/modules"),
      "@/lib": path.resolve(__dirname, "src/lib"),
    },
  },
});
