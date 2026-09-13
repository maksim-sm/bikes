import { describe, expect, it } from "vitest";
import { isDeadlockError, withDeadlockRetry } from "./db-retry";

describe("deadlock retry", () => {
  it("retries Prisma P2034 and SQLSTATE deadlocks, then succeeds", async () => {
    let calls = 0;
    const result = await withDeadlockRetry(async () => {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error("Transaction failed"), { code: "P2034" });
      }
      if (calls === 2) {
        throw Object.assign(new Error("deadlock detected"), { code: "40P01" });
      }
      return "ok";
    });
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry a non-transient conflict", async () => {
    let calls = 0;
    await expect(
      withDeadlockRetry(async () => {
        calls += 1;
        throw new Error("insufficient available inventory");
      }),
    ).rejects.toThrow("insufficient available inventory");
    expect(calls).toBe(1);
  });

  it("rethrows after the attempt budget", async () => {
    await expect(
      withDeadlockRetry(async () => {
        throw Object.assign(new Error("deadlock detected"), { code: "40P01" });
      }, 2),
    ).rejects.toMatchObject({ code: "40P01" });
    expect(
      isDeadlockError({ code: "40001", message: "could not serialize access" }),
    ).toBe(true);
    expect(isDeadlockError(new Error("validation"))).toBe(false);
  });
});
