import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Directory names under `prisma/migrations/`, oldest first. */
export function listCommittedMigrations(root: string): string[] {
  const dir = join(root, "prisma/migrations");
  return readdirSync(dir)
    .filter((name) => {
      if (name === "migration_lock.toml") {
        return false;
      }
      return statSync(join(dir, name)).isDirectory();
    })
    .sort();
}
