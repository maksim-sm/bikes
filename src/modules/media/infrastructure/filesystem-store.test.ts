import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFilesystemMediaStore } from "./filesystem-store";

const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
  0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00,
  0x00, 0x90, 0x77, 0x53, 0xde,
]);

describe("filesystem media store", () => {
  let root = "";

  afterEach(async () => {
    if (root.length > 0) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes, reads, and deletes under the root, refusing traversal", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "bikes-media-"));
    const store = createFilesystemMediaStore(root);
    await store.put("2026/09/a.png", PNG_1X1, "image/png");
    expect(await store.get("2026/09/a.png")).toEqual(PNG_1X1);
    await expect(store.put("../secret.png", PNG_1X1, "image/png")).rejects.toThrow(
      "media_key_invalid",
    );
    await store.delete("2026/09/a.png");
    expect(await store.get("2026/09/a.png")).toBeNull();
  });
});
