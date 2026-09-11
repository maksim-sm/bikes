/**
 * Validates the current environment without starting the application.
 *
 * Useful before a deployment, and as a fast CI check that `.env.example` and
 * the schema in `src/lib/config.ts` have not drifted apart.
 */
async function main(): Promise<void> {
  try {
    const { env } = await import("../src/lib/config.js");
    console.log("Environment configuration is valid.");
    console.log(`  NODE_ENV   ${env.NODE_ENV}`);
    console.log(`  APP_URL    ${env.APP_URL}`);
    console.log(`  APP_LOCALE ${env.APP_LOCALE}`);
    console.log(`  LOG_LEVEL  ${env.LOG_LEVEL}`);
    const database = new URL(env.DATABASE_URL);
    console.log(`  DATABASE   ${database.host}${database.pathname}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
