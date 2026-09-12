import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isMediaKey } from "../domain/placeholder";
import type { MediaStore } from "../application/ports";

export function createFilesystemMediaStore(rootDir: string): MediaStore {
  const root = path.resolve(rootDir);

  function resolveKey(key: string): string {
    if (!isMediaKey(key)) {
      throw new Error("media_key_invalid");
    }
    const resolved = path.resolve(root, key);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("media_key_invalid");
    }
    return resolved;
  }

  return {
    async put(key, bytes) {
      const file = resolveKey(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(resolveKey(key)));
      } catch {
        return null;
      }
    },
    async delete(key) {
      try {
        await unlink(resolveKey(key));
      } catch {
        // Missing object is already gone.
      }
    },
  };
}
