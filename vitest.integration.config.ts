import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "integration",
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    passWithNoTests: false,
    allowOnly: !process.env.CI,
    fileParallelism: false,
    pool: "forks",
    maxWorkers: 1,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    hookTimeout: 60_000,
    testTimeout: 30_000,
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
