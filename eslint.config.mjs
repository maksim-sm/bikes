import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

/**
 * The `no-restricted-imports` blocks below are not style rules: they are the
 * mechanical enforcement of the dependency direction in `docs/architecture.md`
 * (`app/ -> modules/ -> lib/`). A boundary that CI does not check degrades into
 * a suggestion, so these failures should be treated as design errors rather
 * than lint noise.
 */
const deepModuleImport = {
  group: ["@/modules/*/*"],
  message:
    "Import a module through its public entry point (`@/modules/<name>`). Its domain, application, and infrastructure layers are internal.",
};

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "src/generated/**",
      "test-results/**",
      "playwright-report/**",
      "blob-report/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next,

  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Type-aware linting, limited to our own TypeScript sources.
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },

  // lib/ is infrastructure with no domain knowledge: it may not depend on
  // anything above it.
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*", "@/app/*", "@/ui", "@/ui/*"],
              message:
                "lib/ must not depend on domain modules, the app layer, or the design system. Invert the dependency.",
            },
          ],
        },
      ],
    },
  },

  // Domain modules may use lib/ and other modules' public entry points only.
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            deepModuleImport,
            {
              group: ["@/app/*"],
              message:
                "Domain modules must not depend on the app layer. Pass what you need in as an argument.",
            },
          ],
        },
      ],
    },
  },

  // A module's own domain layer must stay pure: no I/O, no infrastructure.
  {
    files: ["src/modules/*/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            deepModuleImport,
            {
              group: ["@/lib/*", "@/app/*", "../infrastructure/*", "../application/*"],
              message:
                "The domain layer is pure: no database, no configuration, no framework. Express the need as a port in application/ instead.",
            },
          ],
        },
      ],
    },
  },

  // The app layer renders and routes; it never reaches into the database.
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            deepModuleImport,
            {
              group: ["@/lib/db", "@/lib/db/*"],
              message:
                "The app layer must not access the database directly. Call a module's service instead.",
            },
          ],
        },
      ],
    },
  },

  // The design system is presentation only: it must not know what a bicycle,
  // an order, or a price is.
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*", "@/app/*"],
              message:
                "src/ui holds domain-agnostic primitives. A component that knows about products or orders is a feature component and belongs with its module or in src/app.",
            },
          ],
        },
      ],
    },
  },

  // Scripts run outside the application and are allowed to talk to the console.
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  prettier,
);
