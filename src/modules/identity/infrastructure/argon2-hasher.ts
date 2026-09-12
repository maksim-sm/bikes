import { hash, verify } from "@node-rs/argon2";
import type { PasswordHasher } from "../application/auth-ports";

/**
 * OWASP recommended Argon2id parameters (m=19456 KiB, t=2, p=1).
 * Tests use a cheaper profile so the suite stays in milliseconds.
 */
export function createArgon2PasswordHasher(options?: {
  cheap?: boolean;
}): PasswordHasher {
  const memoryCost = options?.cheap ? 8 * 1024 : 19 * 1024;
  const timeCost = options?.cheap ? 1 : 2;
  return {
    hash(password) {
      return hash(password, {
        memoryCost,
        timeCost,
        outputLen: 32,
        parallelism: 1,
        // Default algorithm in @node-rs/argon2 is Argon2id.
      });
    },
    verify(hashed, password) {
      return verify(hashed, password);
    },
  };
}
