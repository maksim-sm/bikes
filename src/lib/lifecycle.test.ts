import { afterEach, describe, expect, it } from "vitest";
import { beginDrain, isDraining, resetLifecycle } from "./lifecycle";
import { checkReadiness, resetDatabasePing, setDatabasePing } from "./readiness";

afterEach(() => {
  resetLifecycle();
  resetDatabasePing();
});

describe("process lifecycle", () => {
  it("stays live while draining and fails readiness", async () => {
    setDatabasePing(async () => undefined);
    expect(isDraining()).toBe(false);
    expect(await checkReadiness()).toEqual({ ready: true });
    beginDrain();
    expect(isDraining()).toBe(true);
    expect(await checkReadiness()).toEqual({ ready: false, reason: "draining" });
  });

  it("fails readiness when the database ping throws", async () => {
    setDatabasePing(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await checkReadiness()).toEqual({ ready: false, reason: "database" });
  });
});
