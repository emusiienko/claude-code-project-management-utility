import { test, expect } from "@playwright/test";
import { createProject, createStory, createTask, NON_EXISTENT_UUID } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Task Links

async function firstLinkTypeValue(request: any, projectId: string): Promise<string> {
  const res = await request.get(`/v1/projects/${projectId}/settings/effective`);
  const settings = (await res.json()).data;
  const entries = settings.link_types as { value: string }[];
  expect(entries.length).toBeGreaterThan(0);
  return entries[0].value;
}

test.describe("Task Links", () => {
  test("create, list, delete happy path (same-story constraint)", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const source = await createTask(request, story.id);
    const target = await createTask(request, story.id);
    const linkType = await firstLinkTypeValue(request, project.id);

    const createRes = await request.post(`/v1/tasks/${source.id}/links`, {
      data: { target_task_id: target.id, link_type: linkType },
    });
    expect(createRes.status()).toBe(201);
    const link = (await createRes.json()).data;
    expect(link.source_task_id).toBe(source.id);
    expect(link.target_task_id).toBe(target.id);

    const listRes = await request.get(`/v1/tasks/${source.id}/links`);
    expect(listRes.status()).toBe(200);
    const list = (await listRes.json()).data;
    expect(list.some((l: any) => l.id === link.id)).toBe(true);

    const delRes = await request.delete(`/v1/task-links/${link.id}`);
    expect(delRes.status()).toBe(204);
  });

  test("self-link is rejected with 422", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const task = await createTask(request, story.id);
    const linkType = await firstLinkTypeValue(request, project.id);

    const res = await request.post(`/v1/tasks/${task.id}/links`, {
      data: { target_task_id: task.id, link_type: linkType },
    });
    expect(res.status()).toBe(422);
  });

  test("cross-story link is rejected with 422", async ({ request }) => {
    const project = await createProject(request);
    const storyA = await createStory(request, project.id);
    const storyB = await createStory(request, project.id);
    const source = await createTask(request, storyA.id);
    const target = await createTask(request, storyB.id);
    const linkType = await firstLinkTypeValue(request, project.id);

    const res = await request.post(`/v1/tasks/${source.id}/links`, {
      data: { target_task_id: target.id, link_type: linkType },
    });
    expect(res.status()).toBe(422);
  });

  test("duplicate (source, target, link_type) is rejected with 409", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const source = await createTask(request, story.id);
    const target = await createTask(request, story.id);
    const linkType = await firstLinkTypeValue(request, project.id);

    const first = await request.post(`/v1/tasks/${source.id}/links`, {
      data: { target_task_id: target.id, link_type: linkType },
    });
    expect(first.status()).toBe(201);

    const dup = await request.post(`/v1/tasks/${source.id}/links`, {
      data: { target_task_id: target.id, link_type: linkType },
    });
    expect(dup.status()).toBe(409);
  });

  test("missing source or target task returns 404", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const task = await createTask(request, story.id);
    const linkType = await firstLinkTypeValue(request, project.id);

    const res = await request.post(`/v1/tasks/${NON_EXISTENT_UUID}/links`, {
      data: { target_task_id: task.id, link_type: linkType },
    });
    expect(res.status()).toBe(404);
  });
});
