import type { MediaAsset } from "../domain/image";
import type { MediaReferences, MediaRepository, MediaStore } from "../application/ports";

export function createMemoryMediaStore(initial?: Map<string, Uint8Array>): MediaStore {
  const objects = initial ?? new Map<string, Uint8Array>();
  return {
    async put(key, bytes) {
      objects.set(key, bytes);
    },
    async get(key) {
      return objects.get(key) ?? null;
    },
    async delete(key) {
      objects.delete(key);
    },
  };
}

export function createMemoryMediaRepository(initial?: MediaAsset[]): MediaRepository {
  const assets = new Map((initial ?? []).map((asset) => [asset.id, asset]));
  return {
    async save(asset) {
      assets.set(asset.id, asset);
      return asset;
    },
    async findByKey(key) {
      return [...assets.values()].find((asset) => asset.key === key) ?? null;
    },
    async findById(id) {
      return assets.get(id) ?? null;
    },
    async delete(id) {
      assets.delete(id);
    },
  };
}

export function createMemoryMediaReferences(keys?: Iterable<string>): MediaReferences {
  const referenced = new Set(keys ?? []);
  return {
    async isReferenced(key) {
      return referenced.has(key);
    },
  };
}
