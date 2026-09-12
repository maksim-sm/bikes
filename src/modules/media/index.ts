/**
 * media module — public entry point.
 *
 * Owns image storage behind a provider-neutral interface. Catalog stores
 * opaque keys; this module turns a key into bytes or a URL.
 */

export { isMediaKey, mediaSrc, placeholderSvg } from "./domain/placeholder";
