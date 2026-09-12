import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireCatalogRole, type Principal } from "@/modules/identity";
import { mediaSrc } from "../domain/placeholder";
import {
  assertUpload,
  buildObjectKey,
  detectImageType,
  readImageSize,
  sanitizeOriginalName,
  type MediaAsset,
} from "../domain/image";
import type { Clock, MediaReferences, MediaRepository, MediaStore } from "./ports";

export interface MediaObject {
  bytes: Uint8Array;
  contentType: string;
}

export interface MediaServices {
  upload(
    principal: Principal,
    input: { bytes: Uint8Array; filename?: string; claimedType?: string },
  ): Promise<MediaAsset>;
  getAsset(key: string): Promise<MediaAsset | null>;
  getObject(key: string): Promise<MediaObject | null>;
  delete(principal: Principal, key: string): Promise<void>;
  urlFor(key: string): string;
}

function mapUploadError(error: unknown): never {
  if (error instanceof Error) {
    const messages: Record<string, string> = {
      media_empty: "upload is empty",
      media_too_large: "upload exceeds the size limit",
      media_type_invalid: "file is not a JPEG, PNG, or WebP image",
    };
    const mapped = messages[error.message];
    if (mapped) {
      throw new ValidationError(mapped, { reason: error.message });
    }
  }
  throw error;
}

export function createMediaServices(deps: {
  store: MediaStore;
  assets: MediaRepository;
  references: MediaReferences;
  clock: Clock;
}): MediaServices {
  return {
    async upload(principal, input) {
      requireCatalogRole(principal);
      let detected;
      try {
        detected = assertUpload(input.bytes);
      } catch (error) {
        mapUploadError(error);
      }
      const id = crypto.randomUUID();
      const key = buildObjectKey({
        id,
        extension: detected.extension,
        now: deps.clock.now(),
      });
      const size = readImageSize(input.bytes, detected);
      const asset: MediaAsset = {
        id,
        key,
        contentType: detected.contentType,
        byteSize: input.bytes.byteLength,
        width: size?.width ?? null,
        height: size?.height ?? null,
        originalName: sanitizeOriginalName(input.filename ?? ""),
        createdAt: deps.clock.now(),
      };
      await deps.store.put(key, input.bytes, detected.contentType);
      return deps.assets.save(asset);
    },

    async getAsset(key) {
      return deps.assets.findByKey(key);
    },

    async getObject(key) {
      const bytes = await deps.store.get(key);
      if (!bytes) {
        return null;
      }
      const asset = await deps.assets.findByKey(key);
      return {
        bytes,
        contentType:
          detectImageType(bytes)?.contentType ??
          asset?.contentType ??
          "application/octet-stream",
      };
    },

    async delete(principal, key) {
      requireCatalogRole(principal);
      const asset = await deps.assets.findByKey(key);
      if (!asset) {
        throw new NotFoundError("media not found", { key });
      }
      if (await deps.references.isReferenced(key)) {
        throw new ConflictError("media is still attached to a product", { key });
      }
      await deps.store.delete(key);
      await deps.assets.delete(asset.id);
    },

    urlFor(key) {
      return mediaSrc(key);
    },
  };
}
