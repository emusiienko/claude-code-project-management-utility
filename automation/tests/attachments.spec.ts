import { test, expect } from "@playwright/test";
import { createProject, createStory, NON_EXISTENT_UUID } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Attachments

test.describe("Attachments", () => {
  test("create document (JSON) then read metadata and file bytes, then delete", async ({
    request,
  }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const createRes = await request.post(`/v1/stories/${story.id}/attachments`, {
      data: {
        title: "Design notes",
        kind: "document",
        content: "# Hello",
        mime_type: "text/markdown",
      },
    });
    expect(createRes.status()).toBe(201);
    const attachment = (await createRes.json()).data;
    expect(attachment.title).toBe("Design notes");
    expect(attachment.kind).toBe("document");
    expect(attachment).not.toHaveProperty("file_path");

    const getRes = await request.get(`/v1/attachments/${attachment.id}`);
    expect(getRes.status()).toBe(200);

    const fileRes = await request.get(`/v1/attachments/${attachment.id}/file`);
    expect(fileRes.status()).toBe(200);
    expect(fileRes.headers()["content-type"]).toContain("text/markdown");
    expect(await fileRes.text()).toBe("# Hello");

    const delRes = await request.delete(`/v1/attachments/${attachment.id}`);
    expect(delRes.status()).toBe(204);
  });

  test("external-ref attachment has no stored file (400 on /file)", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const createRes = await request.post(`/v1/stories/${story.id}/attachments`, {
      data: { title: "External doc", kind: "external-ref", external_url: "https://example.com" },
    });
    expect(createRes.status()).toBe(201);
    const attachment = (await createRes.json()).data;

    const fileRes = await request.get(`/v1/attachments/${attachment.id}/file`);
    expect(fileRes.status()).toBe(400);
  });

  test("missing/empty title is rejected with 422", async ({ request }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const res = await request.post(`/v1/stories/${story.id}/attachments`, {
      data: { title: "", kind: "document", content: "x", mime_type: "text/plain" },
    });
    expect(res.status()).toBe(422);
  });

  test("create under an unknown container returns 404", async ({ request }) => {
    const res = await request.post(`/v1/stories/${NON_EXISTENT_UUID}/attachments`, {
      data: { title: "Orphan", kind: "document", content: "x", mime_type: "text/plain" },
    });
    expect(res.status()).toBe(404);
  });

  test("list supports kind filter and a stale type param is silently ignored", async ({
    request,
  }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    await request.post(`/v1/stories/${story.id}/attachments`, {
      data: { title: "Doc", kind: "document", content: "x", mime_type: "text/plain" },
    });

    const res = await request.get(`/v1/stories/${story.id}/attachments?kind=document&type=stale`);
    expect(res.status()).toBe(200);
    const list = (await res.json()).data;
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((a: any) => a.kind === "document")).toBe(true);
  });
});
