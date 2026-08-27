import { test, expect } from "@playwright/test";
import { createProject, createMilestone, NON_EXISTENT_UUID } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Milestones

test.describe("Milestones", () => {
  test("create, read, update, delete happy path (starts planned)", async ({ request }) => {
    const project = await createProject(request);
    const milestone = await createMilestone(request, project.id);
    expect(milestone.status).toBe("planned");

    const getRes = await request.get(`/v1/milestones/${milestone.id}`);
    expect(getRes.status()).toBe(200);
    expect((await getRes.json()).data.story_count).toBe(0);

    const putRes = await request.put(`/v1/milestones/${milestone.id}`, {
      data: { description: "updated" },
    });
    expect(putRes.status()).toBe(200);
    expect((await putRes.json()).data.description).toBe("updated");

    const delRes = await request.delete(`/v1/milestones/${milestone.id}`);
    expect(delRes.status()).toBe(204);
  });

  test("duplicate name within the same project conflicts with 409", async ({ request }) => {
    const project = await createProject(request);
    const milestone = await createMilestone(request, project.id);

    const dup = await request.post("/v1/milestones", {
      data: { project_id: project.id, name: milestone.name },
    });
    expect(dup.status()).toBe(409);
  });

  test("activate demotes the project's previously-active milestone; finish is independent", async ({
    request,
  }) => {
    const project = await createProject(request);
    const first = await createMilestone(request, project.id);
    const second = await createMilestone(request, project.id);

    const activateFirst = await request.post(`/v1/milestones/${first.id}/activate`);
    expect(activateFirst.status()).toBe(200);
    expect((await activateFirst.json()).data.status).toBe("active");

    const activateSecond = await request.post(`/v1/milestones/${second.id}/activate`);
    expect(activateSecond.status()).toBe(200);

    const firstAfter = await (await request.get(`/v1/milestones/${first.id}`)).json();
    expect(firstAfter.data.status).toBe("planned");

    const finishSecond = await request.post(`/v1/milestones/${second.id}/finish`);
    expect(finishSecond.status()).toBe(200);
    expect((await finishSecond.json()).data.status).toBe("finished");
  });

  test("create under an unknown project returns 404", async ({ request }) => {
    const res = await request.post("/v1/milestones", {
      data: { project_id: NON_EXISTENT_UUID, name: "orphan milestone" },
    });
    expect(res.status()).toBe(404);
  });

  test("delete clears milestone_id on assigned stories without deleting them", async ({
    request,
  }) => {
    const project = await createProject(request);
    const milestone = await createMilestone(request, project.id);
    const storyRes = await request.post("/v1/stories", {
      data: { project_id: project.id, title: "assigned story", milestone_id: milestone.id },
    });
    const story = (await storyRes.json()).data;

    const delRes = await request.delete(`/v1/milestones/${milestone.id}`);
    expect(delRes.status()).toBe(204);

    const storyAfter = await (await request.get(`/v1/stories/${story.id}`)).json();
    expect(storyAfter.data.milestone_id).toBeNull();
  });
});
