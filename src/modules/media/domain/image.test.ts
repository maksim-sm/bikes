import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  assertUpload,
  buildObjectKey,
  detectImageType,
  readImageSize,
  sanitizeOriginalName,
} from "./image";

/** 1×1 PNG. Type and size come from the bytes, not the name. */
const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
  0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00,
  0x00, 0x90, 0x77, 0x53, 0xde,
]);

const JPEG_SOI = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
  0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x20, 0x00,
  0x30, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
]);

const HTML_AS_JPEG = new TextEncoder().encode(
  "<!doctype html><html><body>x</body></html>",
);
const SVG_AS_PNG = new TextEncoder().encode(
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>',
);

describe("image type detection", () => {
  it("reads JPEG, PNG, and WebP from magic bytes", () => {
    expect(detectImageType(PNG_1X1)?.contentType).toBe("image/png");
    expect(detectImageType(JPEG_SOI)?.contentType).toBe("image/jpeg");
    const webp = new Uint8Array(30);
    webp.set(new TextEncoder().encode("RIFF"), 0);
    webp.set(new TextEncoder().encode("WEBP"), 8);
    expect(detectImageType(webp)?.contentType).toBe("image/webp");
  });

  it("rejects HTML and SVG even when they pretend to be images", () => {
    expect(detectImageType(HTML_AS_JPEG)).toBeNull();
    expect(detectImageType(SVG_AS_PNG)).toBeNull();
    expect(() => assertUpload(HTML_AS_JPEG)).toThrow("media_type_invalid");
    expect(() => assertUpload(SVG_AS_PNG)).toThrow("media_type_invalid");
  });

  it("ignores client MIME type and file extension when the bytes are a real image", () => {
    expect(detectImageType(PNG_1X1)?.extension).toBe("png");
    expect(() => assertUpload(PNG_1X1)).not.toThrow();
  });

  it("reads PNG dimensions from IHDR", () => {
    expect(
      readImageSize(PNG_1X1, { contentType: "image/png", extension: "png" }),
    ).toEqual({
      width: 1,
      height: 1,
    });
    expect(
      readImageSize(JPEG_SOI, { contentType: "image/jpeg", extension: "jpg" }),
    ).toEqual({
      width: 48,
      height: 32,
    });
  });

  it("rejects empty and oversized payloads", () => {
    expect(() => assertUpload(new Uint8Array())).toThrow("media_empty");
    expect(() => assertUpload(new Uint8Array(MAX_UPLOAD_BYTES + 1))).toThrow(
      "media_too_large",
    );
  });
});

describe("safe object keys", () => {
  it("builds a dated key from a generated id, not the upload name", () => {
    const key = buildObjectKey({
      id: "11111111-2222-3333-4444-555555555555",
      extension: "jpg",
      now: new Date("2026-09-12T12:00:00.000Z"),
    });
    expect(key).toBe("2026/09/11111111-2222-3333-4444-555555555555.jpg");
    expect(key).not.toContain("..");
    expect(key).not.toContain("photo");
  });

  it("strips path segments and unsafe characters from the original name", () => {
    expect(sanitizeOriginalName("../../etc/passwd.jpg")).toBe("passwd.jpg");
    expect(sanitizeOriginalName("Мой велик!.PNG")).toBe("-.PNG");
    expect(sanitizeOriginalName("emonda front.png")).toBe("emonda-front.png");
    expect(sanitizeOriginalName("...")).toBeNull();
  });
});
