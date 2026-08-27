import { test, expect } from "@playwright/test";
import { createProject, createStory, NON_EXISTENT_UUID } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Stories

test.describe("Stories", () => {
  test("create requires an existing project (404) then supports full CRUD", async ({ request }) => {
    const badCreate = await request.post("/v1/stories", {
      data: { project_id: NON_EXISTENT_UUID, title: "orphan story" },
    });
    expect(badCreate.status()).toBe(404);

    const project = await createProject(request);
    const story = await createStory(request, project.id, { content: "hello" });
    expect(story.project_id).toBe(project.id);

    const getRes = await request.get(`/v1/stories/${story.id}`);
    expect(getRes.status()).toBe(200);

    const putRes = await request.put(`/v1/stories/${story.id}`, { data: { title: "updated title" } });
    expect(putRes.status()).toBe(200);
    expect((await putRes.json()).data.title).toBe("updated title");

    const delRes = await request.delete(`/v1/stories/${story.id}`);
    expect(delRes.status()).toBe(204);
  });

  test("invalid status value is rejected with 422 UNPROCESSABLE", async ({ request }) => {
    const project = await createProject(request);
    const res = await request.post("/v1/stories", {
      data: { project_id: project.id, title: "bad status", status: "not-a-real-status" },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).code).toBe("UNPROCESSABLE");
  });

  test("list requires project_id (404 for unknown project)", async ({ request }) => {
    const res = await request.get(`/v1/stories?project_id=${NON_EXISTENT_UUID}`);
    expect(res.status()).toBe(404);
  });

  test("aggregate returns zero counts for a task-less story", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const res = await request.get(`/v1/stories/${story.id}/aggregate`);
    expect(res.status()).toBe(200);
    const aggregate = (await res.json()).data;
    expect(aggregate.story_id).toBe(story.id);
    expect(aggregate.total_tasks).toBe(0);
  });

  test("detail composes links, attachments, and comments (empty for a fresh story)", async ({
    request,
  }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const res = await request.get(`/v1/stories/${story.id}/detail`);
    expect(res.status()).toBe(200);
    const detail = (await res.json()).data;
    expect(detail.links).toEqual([]);
    expect(detail.attachments).toEqual([]);
    expect(detail.comments).toEqual([]);
  });
});
