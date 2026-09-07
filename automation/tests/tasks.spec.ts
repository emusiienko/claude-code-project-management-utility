import { test, expect } from "@playwright/test";
import { createProject, createStory, createTask, NON_EXISTENT_UUID } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Tasks

test.describe("Tasks", () => {
  test("create, read, update, delete happy path", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const task = await createTask(request, story.id, { assignee_role: "operator" });
    expect(task.story_id).toBe(story.id);
    expect(task.status).toBe("todo");

    const getRes = await request.get(`/v1/tasks/${task.id}`);
    expect(getRes.status()).toBe(200);

    const putRes = await request.put(`/v1/tasks/${task.id}`, { data: { status: "in-progress" } });
    expect(putRes.status()).toBe(200);
    expect((await putRes.json()).data.status).toBe("in-progress");

    const delRes = await request.delete(`/v1/tasks/${task.id}`);
    expect(delRes.status()).toBe(204);
  });

  test("unknown type is rejected with 422 UNPROCESSABLE", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const res = await request.post(`/v1/stories/${story.id}/tasks`, {
      data: { title: "bad type", type: "not-a-real-type", status: "todo" },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).code).toBe("UNPROCESSABLE");
  });

  test("create under an unknown story returns 404", async ({ request }) => {
    const res = await request.post(`/v1/stories/${NON_EXISTENT_UUID}/tasks`, {
      data: { title: "orphan task", type: "task", status: "todo" },
    });
    expect(res.status()).toBe(404);
  });

  test("detail composes links, attachments, and comments (empty for a fresh task)", async ({
    request,
  }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const task = await createTask(request, story.id);

    const res = await request.get(`/v1/tasks/${task.id}/detail`);
    expect(res.status()).toBe(200);
    const detail = (await res.json()).data;
    expect(detail.links).toEqual([]);
    expect(detail.attachments).toEqual([]);
    expect(detail.comments).toEqual([]);
  });
});

// `GET /tasks/:id/dependencies` was retired from the contract at v1.10 (STORY-001 Reconcile) — it was
// specified but never built, and the user decided to remove it from the contract rather than
// back-fill it. Task dependency information is served via `GET /tasks/:id/detail`'s `links` instead.
// No test remains for it: there is no longer any contract-documented behavior to encode. See
// `documentation/technical/api-contracts/coordination-service.md` § Versioning & status, v1.10.
