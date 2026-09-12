import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/modules/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@/modules": path.resolve(__dirname, "src/modules"),
      "@/lib": path.resolve(__dirname, "src/lib"),
    },
  },
});
