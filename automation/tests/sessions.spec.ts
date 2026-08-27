import { test, expect } from "@playwright/test";
import {
  createProject,
  createSession,
  getEffectiveParticipantRole,
  NON_EXISTENT_UUID,
} from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Sessions

test.describe("Sessions", () => {
  test("create, read, update, archive happy path", async ({ request }) => {
    const project = await createProject(request);
    const session = await createSession(request, project.id);
    expect(session.status).toBe("pending");
    expect(session.archived_at).toBeNull();

    const getRes = await request.get(`/v1/sessions/${session.id}`);
    expect(getRes.status()).toBe(200);

    const putRes = await request.put(`/v1/sessions/${session.id}`, {
      data: { status: "in-progress" },
    });
    expect(putRes.status()).toBe(200);
    expect((await putRes.json()).data.status).toBe("in-progress");

    const archiveRes = await request.post(`/v1/sessions/${session.id}/archive`);
    expect(archiveRes.status()).toBe(200);
    expect((await archiveRes.json()).data.archived_at).toBeTruthy();

    const doubleArchive = await request.post(`/v1/sessions/${session.id}/archive`);
    expect(doubleArchive.status()).toBe(400);
  });

  test("a status value in create is silently ignored — every session starts pending", async ({
    request,
  }) => {
    const project = await createProject(request);
    const role = await getEffectiveParticipantRole(request, project.id);

    const res = await request.post("/v1/sessions", {
      data: {
        project_id: project.id,
        topic: "t",
        goal: "g",
        participant_role: role,
        status: "finished",
      },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).data.status).toBe("pending");
  });

  test("unknown participant_role is rejected with 422", async ({ request }) => {
    const project = await createProject(request);

    const res = await request.post("/v1/sessions", {
      data: { project_id: project.id, topic: "t", goal: "g", participant_role: "not-a-role-xyz" },
    });
    expect(res.status()).toBe(422);
  });

  test("out-of-set status update is rejected with 422", async ({ request }) => {
    const project = await createProject(request);
    const session = await createSession(request, project.id);

    const res = await request.put(`/v1/sessions/${session.id}`, { data: { status: "done" } });
    expect(res.status()).toBe(422);
  });

  test("list requires project_id and filters by incomplete", async ({ request }) => {
    const project = await createProject(request);
    const session = await createSession(request, project.id);

    const missingProjectId = await request.get("/v1/sessions");
    expect(missingProjectId.status()).toBe(422);

    const listRes = await request.get(`/v1/sessions?project_id=${project.id}&incomplete=true`);
    expect(listRes.status()).toBe(200);
    const list = (await listRes.json()).data;
    expect(list.some((s: any) => s.id === session.id)).toBe(true);
  });

  test("linking to a non-existent story returns 404", async ({ request }) => {
    const project = await createProject(request);
    const role = await getEffectiveParticipantRole(request, project.id);

    const res = await request.post("/v1/sessions", {
      data: {
        project_id: project.id,
        topic: "t",
        goal: "g",
        participant_role: role,
        linked_story_id: NON_EXISTENT_UUID,
      },
    });
    expect(res.status()).toBe(404);
  });
});
