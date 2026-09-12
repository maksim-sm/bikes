/**
 * media module — public entry point.
 *
 * Owns stored bytes and metadata. Catalog stores opaque keys and associations,
 * never URLs. Type is decided from magic bytes, not the client filename or MIME.
 */

export { isMediaKey, mediaSrc, placeholderSvg } from "./domain/placeholder";
export {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  assertUpload,
  detectImageType,
  type MediaAsset,
} from "./domain/image";
export type {
  Clock,
  MediaReferences,
  MediaRepository,
  MediaStore,
} from "./application/ports";
export { createMediaServices, type MediaServices } from "./application/services";
export {
  createFilesystemMediaStore,
  createPrismaMediaRepository,
} from "./application/create-media";
export {
  createMemoryMediaReferences,
  createMemoryMediaRepository,
  createMemoryMediaStore,
} from "./infrastructure/memory";
