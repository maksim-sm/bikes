const SAFE_DATABASE_NAME = /^[a-z][a-z0-9_]*$/;

const LOCAL_DEFAULT = "postgresql://bikes:bikes@localhost:5432/bikes";

/** Same fallback as `prisma.config.ts` so CLI and Prisma agree. */
export function requireDatabaseUrl(): string {
  return process.env["DATABASE_URL"] ?? LOCAL_DEFAULT;
}

export function databaseNameFromUrl(url: string): string {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!SAFE_DATABASE_NAME.test(name)) {
    throw new Error(`Refusing unsafe database name ${JSON.stringify(name)}.`);
  }
  return name;
}

export function withDatabaseName(url: string, name: string): string {
  if (!SAFE_DATABASE_NAME.test(name)) {
    throw new Error(`Refusing unsafe database name ${JSON.stringify(name)}.`);
  }
  const parsed = new URL(url);
  parsed.pathname = `/${name}`;
  return parsed.toString();
}

export function adminDatabaseUrl(url: string): string {
  return (
    process.env["TEST_DATABASE_ADMIN_URL"] ??
    process.env["DATABASE_ADMIN_URL"] ??
    withDatabaseName(url, "postgres")
  );
}

export function redactedDatabase(url: string): string {
  const parsed = new URL(url);
  return `${parsed.host}${parsed.pathname}`;
}

export function isLoopbackHost(url: string): boolean {
  const host = new URL(url).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

const PROTECTED_NAMES = new Set(["postgres", "template0", "template1", "bikes"]);

export function assertDisposableDatabase(name: string): void {
  if (PROTECTED_NAMES.has(name) || name.endsWith("_test")) {
    throw new Error(
      `Refusing to create or drop protected database ${JSON.stringify(name)}.`,
    );
  }
}
