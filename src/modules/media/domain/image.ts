export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export type DetectedImageType = {
  contentType: AllowedContentType;
  extension: "jpg" | "png" | "webp";
};

export interface MediaAsset {
  id: string;
  key: string;
  contentType: AllowedContentType | string;
  byteSize: number;
  width: number | null;
  height: number | null;
  originalName: string | null;
  createdAt: Date;
}

export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length < 12) {
    return null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

export function readImageSize(
  bytes: Uint8Array,
  detected: DetectedImageType,
): { width: number; height: number } | null {
  if (detected.contentType === "image/png") {
    return pngSize(bytes);
  }
  if (detected.contentType === "image/jpeg") {
    return jpegSize(bytes);
  }
  return webpSize(bytes);
}

function u32be(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  );
}

function u16be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) {
    return null;
  }
  const width = u32be(bytes, 16);
  const height = u32be(bytes, 20);
  if (width < 1 || height < 1) {
    return null;
  }
  return { width, height };
}

function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = u16be(bytes, offset + 5);
      const width = u16be(bytes, offset + 7);
      if (width < 1 || height < 1) {
        return null;
      }
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = u16be(bytes, offset + 2);
    if (length < 2) {
      return null;
    }
    offset += 2 + length;
  }
  return null;
}

function webpSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30) {
    return null;
  }
  const fourcc = String.fromCharCode(
    bytes[12] ?? 0,
    bytes[13] ?? 0,
    bytes[14] ?? 0,
    bytes[15] ?? 0,
  );
  if (fourcc === "VP8X") {
    const width =
      1 + ((bytes[24] ?? 0) | ((bytes[25] ?? 0) << 8) | ((bytes[26] ?? 0) << 16));
    const height =
      1 + ((bytes[27] ?? 0) | ((bytes[28] ?? 0) << 8) | ((bytes[29] ?? 0) << 16));
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (fourcc === "VP8 " && bytes.length >= 30) {
    const width = u16be(bytes, 26) & 0x3fff;
    const height = u16be(bytes, 28) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (fourcc === "VP8L" && bytes.length >= 25) {
    const bits =
      (bytes[21] ?? 0) |
      ((bytes[22] ?? 0) << 8) |
      ((bytes[23] ?? 0) << 16) |
      ((bytes[24] ?? 0) << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  return null;
}

export function sanitizeOriginalName(filename: string): string | null {
  const base = filename.replaceAll("\\", "/").split("/").pop() ?? "";
  const cleaned = base
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+/g, ".")
    .slice(0, 80);
  if (cleaned.length === 0 || cleaned === "." || cleaned === "..") {
    return null;
  }
  return cleaned;
}

export function buildObjectKey(input: {
  id: string;
  extension: DetectedImageType["extension"];
  now: Date;
}): string {
  const year = String(input.now.getUTCFullYear());
  const month = String(input.now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${input.id}.${input.extension}`;
}

export function assertUpload(bytes: Uint8Array): DetectedImageType {
  if (bytes.byteLength === 0) {
    throw new Error("media_empty");
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("media_too_large");
  }
  const detected = detectImageType(bytes);
  if (!detected) {
    throw new Error("media_type_invalid");
  }
  return detected;
}
