import { test, expect } from "@playwright/test";
import { createProject, createStory, NON_EXISTENT_UUID } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Comments

test.describe("Comments", () => {
  test("create, read, update, delete happy path", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const createRes = await request.post(`/v1/stories/${story.id}/comments`, {
      data: { content: "First comment", author_role: "operator" },
    });
    expect(createRes.status()).toBe(201);
    const comment = (await createRes.json()).data;
    expect(comment.ancestors).toEqual([]);
    expect(comment.author_role).toBe("operator");

    const getRes = await request.get(`/v1/comments/${comment.id}`);
    expect(getRes.status()).toBe(200);

    const putRes = await request.put(`/v1/comments/${comment.id}`, {
      data: { content: "Edited comment" },
    });
    expect(putRes.status()).toBe(200);
    const updated = (await putRes.json()).data;
    expect(updated.content).toBe("Edited comment");
    // author_role stays immutable — the update body has no such field.
    expect(updated.author_role).toBe("operator");

    const delRes = await request.delete(`/v1/comments/${comment.id}`);
    expect(delRes.status()).toBe(204);
  });

  test("reply derives a root-first ancestors path", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const rootRes = await request.post(`/v1/stories/${story.id}/comments`, {
      data: { content: "Root", author_role: "operator" },
    });
    const root = (await rootRes.json()).data;

    const replyRes = await request.post(`/v1/stories/${story.id}/comments`, {
      data: { content: "Reply", author_role: "operator", in_reply_to: root.id },
    });
    expect(replyRes.status()).toBe(201);
    const reply = (await replyRes.json()).data;
    expect(reply.ancestors).toEqual([root.id]);

    const ancestorsRes = await request.get(`/v1/comments/${reply.id}/ancestors`);
    expect(ancestorsRes.status()).toBe(200);
    const ancestors = await ancestorsRes.json();
    expect(Array.isArray(ancestors)).toBe(true);
    expect(ancestors[0].id).toBe(root.id);
  });

  test("empty content is rejected with 422", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const res = await request.post(`/v1/stories/${story.id}/comments`, {
      data: { content: "", author_role: "operator" },
    });
    expect(res.status()).toBe(422);
  });

  test("reply to a non-existent comment returns 404", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const res = await request.post(`/v1/stories/${story.id}/comments`, {
      data: { content: "orphan reply", author_role: "operator", in_reply_to: NON_EXISTENT_UUID },
    });
    expect(res.status()).toBe(404);
  });

  test("list is newest-first", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const first = await request.post(`/v1/stories/${story.id}/comments`, {
      data: { content: "older", author_role: "operator" },
    });
    const firstBody = (await first.json()).data;
    const second = await request.post(`/v1/stories/${story.id}/comments`, {
      data: { content: "newer", author_role: "operator" },
    });
    const secondBody = (await second.json()).data;

    const listRes = await request.get(`/v1/stories/${story.id}/comments`);
    const list = (await listRes.json()).data;
    const ids = list.map((c: any) => c.id);
    expect(ids.indexOf(secondBody.id)).toBeLessThan(ids.indexOf(firstBody.id));
  });
});
