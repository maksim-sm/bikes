import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError, ValidationError } from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "@/modules/identity";
import { assertUpload } from "../domain/image";
import {
  createMemoryMediaReferences,
  createMemoryMediaRepository,
  createMemoryMediaStore,
} from "../infrastructure/memory";
import { createMediaServices } from "./services";

const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
  0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00,
  0x00, 0x90, 0x77, 0x53, 0xde,
]);

const now = new Date("2026-09-12T12:00:00.000Z");
const manager = staffPrincipal("staff-1", ["manager"]);

function services(referenced: string[] = []) {
  const store = createMemoryMediaStore();
  const assets = createMemoryMediaRepository();
  const media = createMediaServices({
    store,
    assets,
    references: createMemoryMediaReferences(referenced),
    clock: { now: () => now },
  });
  return { media, store, assets };
}

describe("media services", () => {
  it("stores sniffed type and a generated key, ignoring the client name and MIME", async () => {
    const { media, store } = services();
    const asset = await media.upload(manager, {
      bytes: PNG_1X1,
      filename: "../../evil.html",
      claimedType: "text/html",
    });
    expect(asset.contentType).toBe("image/png");
    expect(asset.key).toMatch(/^2026\/09\/[0-9a-f-]{36}\.png$/);
    expect(asset.originalName).toBe("evil.html");
    expect(asset.width).toBe(1);
    expect(asset.height).toBe(1);
    expect(await store.get(asset.key)).toEqual(PNG_1X1);
    expect(media.urlFor(asset.key)).toBe(`/api/media/${asset.key}`);
  });

  it("rejects non-images and callers without manage_catalog", async () => {
    const { media } = services();
    await expect(
      media.upload(manager, {
        bytes: new TextEncoder().encode("<svg></svg>"),
        filename: "bike.jpg",
        claimedType: "image/jpeg",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      media.upload(customerPrincipal("c1"), { bytes: PNG_1X1, filename: "a.png" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(() => assertUpload(new TextEncoder().encode("GIF89a"))).toThrow(
      "media_type_invalid",
    );
  });

  it("object storage failure on put leaves no asset row", async () => {
    const assets = createMemoryMediaRepository();
    const media = createMediaServices({
      store: {
        async put() {
          throw new Error("object_storage_unavailable");
        },
        async get() {
          return null;
        },
        async delete() {},
      },
      assets,
      references: createMemoryMediaReferences(),
      clock: { now: () => now },
    });
    await expect(
      media.upload(manager, { bytes: PNG_1X1, filename: "a.png" }),
    ).rejects.toThrow("object_storage_unavailable");
    expect(await assets.findByKey("2026/09/placeholder.png")).toBeNull();
  });

  it("deletes the object when metadata persist fails after put", async () => {
    const inner = createMemoryMediaStore();
    const written: string[] = [];
    const media = createMediaServices({
      store: {
        async put(key, bytes, contentType) {
          written.push(key);
          return inner.put(key, bytes, contentType);
        },
        get: (key) => inner.get(key),
        delete: (key) => inner.delete(key),
      },
      assets: {
        async save() {
          throw new Error("media_catalog_unavailable");
        },
        async findByKey() {
          return null;
        },
        async findById() {
          return null;
        },
        async delete() {},
      },
      references: createMemoryMediaReferences(),
      clock: { now: () => now },
    });
    await expect(
      media.upload(manager, { bytes: PNG_1X1, filename: "a.png" }),
    ).rejects.toThrow("media_catalog_unavailable");
    expect(written).toHaveLength(1);
    expect(await inner.get(written[0]!)).toBeNull();
  });

  it("deletes unused objects and refuses keys that still illustrate a product", async () => {
    const store = createMemoryMediaStore();
    const assets = createMemoryMediaRepository();
    const referenced = new Set<string>();
    const media = createMediaServices({
      store,
      assets,
      references: {
        async isReferenced(key) {
          return referenced.has(key);
        },
      },
      clock: { now: () => now },
    });
    const asset = await media.upload(manager, { bytes: PNG_1X1, filename: "a.png" });
    referenced.add(asset.key);
    await expect(media.delete(manager, asset.key)).rejects.toBeInstanceOf(ConflictError);
    referenced.delete(asset.key);
    await media.delete(manager, asset.key);
    expect(await store.get(asset.key)).toBeNull();
    expect(await assets.findByKey(asset.key)).toBeNull();
  });
});
