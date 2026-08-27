import { test, expect } from "@playwright/test";
import { createProject, uniqueName, NON_EXISTENT_UUID } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Settings

test.describe("Settings", () => {
  test("system settings expose all five dictionary keys plus the default_web_ui_role scalar", async ({
    request,
  }) => {
    const res = await request.get("/v1/system/settings");
    expect(res.status()).toBe(200);
    const settings = (await res.json()).data;
    for (const key of ["task_statuses", "task_types", "story_statuses", "participant_roles"]) {
      expect(Array.isArray(settings[key])).toBe(true);
    }
    expect(Array.isArray(settings.link_types)).toBe(true);
    if (settings.link_types.length > 0) {
      expect(settings.link_types[0]).toHaveProperty("value");
      expect(settings.link_types[0]).toHaveProperty("outbound");
      expect(settings.link_types[0]).toHaveProperty("inbound");
    }
    expect(typeof settings.default_web_ui_role).toBe("string");
    expect(settings).not.toHaveProperty("attachment_types");
  });

  test("project override replaces (not merges) the system default for a key, effective reflects it", async ({
    request,
  }) => {
    const project = await createProject(request);
    const label = uniqueName("qa-status");

    const putRes = await request.put(`/v1/projects/${project.id}/settings`, {
      data: { task_statuses: [label] },
    });
    expect(putRes.status()).toBe(200);
    expect((await putRes.json()).data.task_statuses).toEqual([label]);

    const effectiveRes = await request.get(`/v1/projects/${project.id}/settings/effective`);
    expect(effectiveRes.status()).toBe(200);
    expect((await effectiveRes.json()).data.task_statuses).toEqual([label]);

    const overridesRes = await request.get(`/v1/projects/${project.id}/settings`);
    expect(overridesRes.status()).toBe(200);
    expect((await overridesRes.json()).data.task_statuses).toEqual([label]);
  });

  test("unknown key on system settings write is rejected with 422", async ({ request }) => {
    const res = await request.put("/v1/system/settings", { data: { attachment_types: ["x"] } });
    expect(res.status()).toBe(422);
  });

  test("default_web_ui_role write outside effective participant_roles is rejected with 422", async ({
    request,
  }) => {
    const project = await createProject(request);
    const res = await request.put(`/v1/projects/${project.id}/settings`, {
      data: { default_web_ui_role: "not-a-real-role-xyz" },
    });
    expect(res.status()).toBe(422);
  });

  test("settings for an unknown project return 404", async ({ request }) => {
    const res = await request.get(`/v1/projects/${NON_EXISTENT_UUID}/settings/effective`);
    expect(res.status()).toBe(404);
  });
});
