import type { MediaAsset } from "../domain/image";

/**
 * Bytes only. Keys are opaque; this port never builds public URLs.
 * Production is S3-compatible; development is the local filesystem.
 */
export interface MediaStore {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export interface MediaRepository {
  save(asset: MediaAsset): Promise<MediaAsset>;
  findByKey(key: string): Promise<MediaAsset | null>;
  findById(id: string): Promise<MediaAsset | null>;
  delete(id: string): Promise<void>;
}

/** Catalog answers whether a key still illustrates a product or variant. */
export interface MediaReferences {
  isReferenced(key: string): Promise<boolean>;
}

export interface Clock {
  now(): Date;
}
