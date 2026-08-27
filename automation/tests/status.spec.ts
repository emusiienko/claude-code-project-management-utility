import { test, expect } from "@playwright/test";

// STORY-010 (v1.9). Contract: documentation/technical/api-contracts/coordination-service.md § Status

test.describe("GET /status", () => {
  test("reports liveness and version, no other keys", async ({ request }) => {
    const res = await request.get("/v1/status");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("ok");
    expect(typeof body.data.version).toBe("string");
    expect(Object.keys(body.data).sort()).toEqual(["status", "version"]);
  });

  test("version is stable across calls", async ({ request }) => {
    const first = await (await request.get("/v1/status")).json();
    const second = await (await request.get("/v1/status")).json();
    expect(second.data.version).toBe(first.data.version);
  });
});
