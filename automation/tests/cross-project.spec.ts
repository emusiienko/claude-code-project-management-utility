import { test, expect } from "@playwright/test";
import { createProject, createStory, createTask } from "../utils/helpers";

// Contract: documentation/technical/api-contracts/coordination-service.md § Cross-project Queries
// Same GET /stories and GET /tasks handlers as the primary lists — project_id becomes optional.
//
// KNOWN DIVERGENCE (found during qa-automation Setup, 2026-08-27): the contract documents both
// endpoints as serving a cross-project read when `project_id` is omitted. As built, `GET /stories`
// without `project_id` returns 422 VALIDATION_ERROR ("project_id: Field required") and `GET /tasks`
// as a bare collection route does not exist at all (404 — absent from the OpenAPI schema; only
// `GET /stories/:storyId/tasks` and `GET /tasks/:id` exist). Neither test below has ever been able
// to pass against this backend. Flagged to the user in the Setup session report for the architect to
// resolve — either back-fill the routes or revise the contract to as-built. Not filed as a formal
// Bug: there is no story in scope to attach it to yet (this surfaced during Project Setup, not a
// story's Prepare/Execute cycle).

test.describe("Cross-project Queries", () => {
  test("GET /stories without project_id returns stories across projects, each with project_id", async ({
    request,
  }) => {
    test.fixme(
      true,
      "GET /stories without project_id — contract says cross-project list, as-built requires project_id (422). See file header."
    );
    const project = await createProject(request);
    const story = await createStory(request, project.id);

    const res = await request.get("/v1/stories?limit=100");
    expect(res.status()).toBe(200);
    const list = (await res.json()).data;
    const found = list.find((s: any) => s.id === story.id);
    expect(found).toBeTruthy();
    expect(found.project_id).toBe(project.id);
  });

  test("GET /tasks without project_id returns tasks across projects, each with story_id", async ({
    request,
  }) => {
    test.fixme(
      true,
      "GET /tasks without project_id — contract documents a cross-project list; the route does not exist as-built (404). See file header."
    );
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const task = await createTask(request, story.id);

    const res = await request.get("/v1/tasks?limit=100");
    expect(res.status()).toBe(200);
    const list = (await res.json()).data;
    const found = list.find((t: any) => t.id === task.id);
    expect(found).toBeTruthy();
    expect(found.story_id).toBe(story.id);
    expect(found.project_id).toBe(project.id);
  });
});
