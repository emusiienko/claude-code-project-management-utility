import { test, expect } from "@playwright/test";
import { createProject, createStory, NON_EXISTENT_UUID } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Story Links

async function firstLinkTypeValue(request: any, projectId: string): Promise<string> {
  const res = await request.get(`/v1/projects/${projectId}/settings/effective`);
  const settings = (await res.json()).data;
  const entries = settings.link_types as { value: string }[];
  expect(entries.length).toBeGreaterThan(0);
  return entries[0].value;
}

test.describe("Story Links", () => {
  test("create, list, delete happy path (same-project constraint)", async ({ request }) => {
    const project = await createProject(request);
    const source = await createStory(request, project.id);
    const target = await createStory(request, project.id);
    const linkType = await firstLinkTypeValue(request, project.id);

    const createRes = await request.post(`/v1/stories/${source.id}/links`, {
      data: { target_story_id: target.id, link_type: linkType },
    });
    expect(createRes.status()).toBe(201);
    const link = (await createRes.json()).data;

    const listRes = await request.get(`/v1/stories/${source.id}/links`);
    expect(listRes.status()).toBe(200);
    const list = (await listRes.json()).data;
    expect(list.some((l: any) => l.id === link.id)).toBe(true);

    const delRes = await request.delete(`/v1/story-links/${link.id}`);
    expect(delRes.status()).toBe(204);
  });

  test("self-link is rejected with 422", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const linkType = await firstLinkTypeValue(request, project.id);

    const res = await request.post(`/v1/stories/${story.id}/links`, {
      data: { target_story_id: story.id, link_type: linkType },
    });
    expect(res.status()).toBe(422);
  });

  test("cross-project link is rejected with 422", async ({ request }) => {
    const projectA = await createProject(request);
    const projectB = await createProject(request);
    const source = await createStory(request, projectA.id);
    const target = await createStory(request, projectB.id);
    const linkType = await firstLinkTypeValue(request, projectA.id);

    const res = await request.post(`/v1/stories/${source.id}/links`, {
      data: { target_story_id: target.id, link_type: linkType },
    });
    expect(res.status()).toBe(422);
  });

  test("duplicate link is rejected with 409", async ({ request }) => {
    const project = await createProject(request);
    const source = await createStory(request, project.id);
    const target = await createStory(request, project.id);
    const linkType = await firstLinkTypeValue(request, project.id);

    const first = await request.post(`/v1/stories/${source.id}/links`, {
      data: { target_story_id: target.id, link_type: linkType },
    });
    expect(first.status()).toBe(201);

    const dup = await request.post(`/v1/stories/${source.id}/links`, {
      data: { target_story_id: target.id, link_type: linkType },
    });
    expect(dup.status()).toBe(409);
  });

  test("missing source or target story returns 404", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const linkType = await firstLinkTypeValue(request, project.id);

    const res = await request.post(`/v1/stories/${NON_EXISTENT_UUID}/links`, {
      data: { target_story_id: story.id, link_type: linkType },
    });
    expect(res.status()).toBe(404);
  });
});
