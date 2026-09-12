import { createHash, randomBytes } from "node:crypto";
import type { TokenDigest } from "../application/auth-ports";

/** 32-byte CSPRNG token; SHA-256 digest stored (Lucia/Oslo session pattern). */
export function createSha256TokenDigest(): TokenDigest {
  return {
    generate() {
      const raw = randomBytes(32).toString("base64url");
      return { raw, hash: this.hash(raw) };
    },
    hash(raw) {
      return createHash("sha256").update(raw).digest("hex");
    },
  };
}
