import { afterEach, describe, expect, it } from "vitest";
import { GET as getReady } from "@/app/api/ready/route";
import { GET as getHealth } from "@/app/api/health/route";
import { beginDrain, resetLifecycle } from "@/lib/lifecycle";
import { resetDatabasePing, setDatabasePing } from "@/lib/readiness";

afterEach(() => {
  resetLifecycle();
  resetDatabasePing();
});

describe("readiness HTTP", () => {
  it("returns 200 when the database ping succeeds", async () => {
    setDatabasePing(async () => undefined);
    const response = await getReady(new Request("http://localhost/api/ready"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; data: { status: string } };
    expect(body).toMatchObject({ ok: true, data: { status: "ready" } });
  });

  it("returns 503 while draining; health stays 200", async () => {
    setDatabasePing(async () => undefined);
    beginDrain();
    const ready = await getReady(new Request("http://localhost/api/ready"));
    expect(ready.status).toBe(503);
    const readyBody = (await ready.json()) as { ok: boolean; error: { code: string } };
    expect(readyBody).toMatchObject({ ok: false, error: { code: "unavailable" } });

    const health = await getHealth(new Request("http://localhost/api/health"));
    expect(health.status).toBe(200);
    const healthBody = (await health.json()) as { data: { draining: boolean } };
    expect(healthBody.data.draining).toBe(true);
  });
});
