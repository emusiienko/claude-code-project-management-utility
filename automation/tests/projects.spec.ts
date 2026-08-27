import { test, expect } from "@playwright/test";
import { createProject, uniqueName, NON_EXISTENT_UUID } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Projects

test.describe("Projects", () => {
  test("create, read, update, delete happy path", async ({ request }) => {
    const project = await createProject(request, { description: "qa-automation smoke" });
    expect(project.id).toBeTruthy();
    expect(project.description).toBe("qa-automation smoke");

    const getRes = await request.get(`/v1/projects/${project.id}`);
    expect(getRes.status()).toBe(200);
    expect((await getRes.json()).data.name).toBe(project.name);

    const newName = uniqueName("qa-project-renamed");
    const putRes = await request.put(`/v1/projects/${project.id}`, { data: { name: newName } });
    expect(putRes.status()).toBe(200);
    expect((await putRes.json()).data.name).toBe(newName);

    const delRes = await request.delete(`/v1/projects/${project.id}`);
    expect(delRes.status()).toBe(204);

    const afterDelete = await request.get(`/v1/projects/${project.id}`);
    expect(afterDelete.status()).toBe(404);
  });

  test("duplicate name (case-insensitive) conflicts with 409", async ({ request }) => {
    const project = await createProject(request);

    const dup = await request.post("/v1/projects/", { data: { name: project.name.toUpperCase() } });
    expect(dup.status()).toBe(409);
    const body = await dup.json();
    expect(body.code).toBe("CONFLICT");
  });

  test("get unknown project returns 404", async ({ request }) => {
    const res = await request.get(`/v1/projects/${NON_EXISTENT_UUID}`);
    expect(res.status()).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
  });

  test("list is paginated", async ({ request }) => {
    const res = await request.get("/v1/projects/?page=1&limit=5");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.meta).toMatchObject({ page: 1, limit: 5 });
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("work-state composes project + stories + tasks breadth-only (v1.9)", async ({ request }) => {
    const project = await createProject(request);

    const res = await request.get(`/v1/projects/${project.id}/work-state`);
    expect(res.status()).toBe(200);
    const workState = (await res.json()).data;
    expect(workState.id).toBe(project.id);
    expect(workState.stories).toEqual([]);
    // Breadth-only shape: no content/labels/attachments/comments/links at project level.
    expect(workState).not.toHaveProperty("content");
  });

  test("work-state on unknown project returns 404", async ({ request }) => {
    const res = await request.get(`/v1/projects/${NON_EXISTENT_UUID}/work-state`);
    expect(res.status()).toBe(404);
  });
});
