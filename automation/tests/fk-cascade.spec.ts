import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  createMilestone,
  createProject,
  createSession,
  createStory,
  createTask,
  getEffectiveParticipantRole,
} from "../utils/helpers";

// STORY-016 — database-enforced FK actions observed through the REST surface.
// Contract: documentation/technical/api-contracts/coordination-service.md
//   § Projects (DELETE /projects/:id cascade), § Stories, § Tasks, § Milestones, § Attachments,
//   § Comments, § Sessions.
// Deviation Report: no API Contract deviations. Rows are always removed at once; the post-delete
// file sweep skips files < 1 hour old (ADR-034), so file bytes of a cascade-deleted attachment are
// deliberately NOT asserted here — only the single-attachment delete removes its file immediately.

async function addAttachment(request: APIRequestContext, path: string, title = "doc") {
  const res = await request.post(`${path}/attachments`, {
    data: { title, kind: "document", content: "# body", mime_type: "text/markdown" },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

async function addComment(request: APIRequestContext, path: string, extra = {}) {
  const res = await request.post(`${path}/comments`, {
    data: { content: "c", author_role: "operator", ...extra },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

async function linkType(request: APIRequestContext, projectId: string): Promise<string> {
  const res = await request.get(`/v1/projects/${projectId}/settings/effective`);
  return (await res.json()).data.link_types[0].value;
}

async function expectGone(request: APIRequestContext, urls: string[]) {
  for (const url of urls) {
    expect((await request.get(url)).status(), url).toBe(404);
  }
}

test.describe("FK cascades (STORY-016)", () => {
  test("deleting a project removes stories, tasks, attachments, comments, links and sessions at every level", async ({
    request,
  }) => {
    const project = await createProject(request);
    const role = await getEffectiveParticipantRole(request, project.id);
    const lt = await linkType(request, project.id);
    const milestone = await createMilestone(request, project.id);
    const s1 = await createStory(request, project.id, { milestone_id: milestone.id });
    const s2 = await createStory(request, project.id);
    const t1 = await createTask(request, s1.id);
    const t2 = await createTask(request, s1.id);

    const storyAtt = await addAttachment(request, `/v1/stories/${s1.id}`);
    const taskAtt = await addAttachment(request, `/v1/tasks/${t1.id}`);
    const msAtt = await addAttachment(request, `/v1/milestones/${milestone.id}`);
    const storyCom = await addComment(request, `/v1/stories/${s1.id}`);
    const reply = await addComment(request, `/v1/stories/${s1.id}`, { in_reply_to: storyCom.id });
    const taskCom = await addComment(request, `/v1/tasks/${t1.id}`);
    const msCom = await addComment(request, `/v1/milestones/${milestone.id}`);

    const tl = await request.post(`/v1/tasks/${t1.id}/links`, {
      data: { target_task_id: t2.id, link_type: lt },
    });
    expect(tl.status()).toBe(201);
    const taskLink = (await tl.json()).data;
    const sl = await request.post(`/v1/stories/${s1.id}/links`, {
      data: { target_story_id: s2.id, link_type: lt },
    });
    expect(sl.status()).toBe(201);
    const storyLink = (await sl.json()).data;

    const session = await createSession(request, project.id, { participant_role: role });
    const linkedSession = await createSession(request, project.id, {
      participant_role: role,
      linked_story_id: s1.id,
      linked_task_id: t1.id,
    });

    expect((await request.delete(`/v1/projects/${project.id}`)).status()).toBe(204);

    await expectGone(request, [
      `/v1/projects/${project.id}`,
      `/v1/stories/${s1.id}`,
      `/v1/stories/${s2.id}`,
      `/v1/tasks/${t1.id}`,
      `/v1/tasks/${t2.id}`,
      `/v1/milestones/${milestone.id}`,
      `/v1/attachments/${storyAtt.id}`,
      `/v1/attachments/${taskAtt.id}`,
      `/v1/attachments/${msAtt.id}`,
      `/v1/comments/${storyCom.id}`,
      `/v1/comments/${reply.id}`,
      `/v1/comments/${taskCom.id}`,
      `/v1/comments/${msCom.id}`,
      `/v1/sessions/${session.id}`,
      `/v1/sessions/${linkedSession.id}`,
    ]);
    // Links have no single-read route; their delete must report not found.
    expect((await request.delete(`/v1/task-links/${taskLink.id}`)).status()).toBe(404);
    expect((await request.delete(`/v1/story-links/${storyLink.id}`)).status()).toBe(404);
  });

  test("deleting a project leaves another project's data untouched", async ({ request }) => {
    const doomed = await createProject(request);
    const kept = await createProject(request);
    const story = await createStory(request, kept.id);
    const task = await createTask(request, story.id);
    const att = await addAttachment(request, `/v1/stories/${story.id}`);
    const com = await addComment(request, `/v1/tasks/${task.id}`);
    await createStory(request, doomed.id);

    expect((await request.delete(`/v1/projects/${doomed.id}`)).status()).toBe(204);

    for (const url of [
      `/v1/projects/${kept.id}`,
      `/v1/stories/${story.id}`,
      `/v1/tasks/${task.id}`,
      `/v1/attachments/${att.id}`,
      `/v1/comments/${com.id}`,
    ]) {
      expect((await request.get(url)).status(), url).toBe(200);
    }
  });

  test("deleting a story removes its tasks, attachments, comments (with replies) and links; session link is nulled", async ({
    request,
  }) => {
    const project = await createProject(request);
    const role = await getEffectiveParticipantRole(request, project.id);
    const lt = await linkType(request, project.id);
    const story = await createStory(request, project.id);
    const other = await createStory(request, project.id);
    const task = await createTask(request, story.id);
    const att = await addAttachment(request, `/v1/stories/${story.id}`);
    const taskAtt = await addAttachment(request, `/v1/tasks/${task.id}`);
    const com = await addComment(request, `/v1/stories/${story.id}`);
    const reply = await addComment(request, `/v1/stories/${story.id}`, { in_reply_to: com.id });
    const sl = await request.post(`/v1/stories/${story.id}/links`, {
      data: { target_story_id: other.id, link_type: lt },
    });
    expect(sl.status()).toBe(201);
    const session = await createSession(request, project.id, {
      participant_role: role,
      linked_story_id: story.id,
      linked_task_id: task.id,
    });

    expect((await request.delete(`/v1/stories/${story.id}`)).status()).toBe(204);

    await expectGone(request, [
      `/v1/stories/${story.id}`,
      `/v1/tasks/${task.id}`,
      `/v1/attachments/${att.id}`,
      `/v1/attachments/${taskAtt.id}`,
      `/v1/comments/${com.id}`,
      `/v1/comments/${reply.id}`,
    ]);
    const inbound = await request.get(`/v1/stories/${other.id}/links`);
    expect((await inbound.json()).data).toHaveLength(0);

    const sessionAfter = await request.get(`/v1/sessions/${session.id}`);
    expect(sessionAfter.status()).toBe(200);
    const s = (await sessionAfter.json()).data;
    expect(s.linked_story_id).toBeNull();
    expect(s.linked_task_id).toBeNull();
  });

  test("deleting a task removes its links, attachments and comments; siblings and session survive with the link nulled", async ({
    request,
  }) => {
    const project = await createProject(request);
    const role = await getEffectiveParticipantRole(request, project.id);
    const lt = await linkType(request, project.id);
    const story = await createStory(request, project.id);
    const task = await createTask(request, story.id);
    const sibling = await createTask(request, story.id);
    const att = await addAttachment(request, `/v1/tasks/${task.id}`);
    const com = await addComment(request, `/v1/tasks/${task.id}`);
    const siblingAtt = await addAttachment(request, `/v1/tasks/${sibling.id}`);
    const link = await request.post(`/v1/tasks/${task.id}/links`, {
      data: { target_task_id: sibling.id, link_type: lt },
    });
    expect(link.status()).toBe(201);
    const session = await createSession(request, project.id, {
      participant_role: role,
      linked_story_id: story.id,
      linked_task_id: task.id,
    });

    expect((await request.delete(`/v1/tasks/${task.id}`)).status()).toBe(204);

    await expectGone(request, [
      `/v1/tasks/${task.id}`,
      `/v1/attachments/${att.id}`,
      `/v1/comments/${com.id}`,
    ]);
    const links = await request.get(`/v1/tasks/${sibling.id}/links`);
    expect((await links.json()).data).toHaveLength(0);
    expect((await request.get(`/v1/attachments/${siblingAtt.id}`)).status()).toBe(200);

    const s = (await (await request.get(`/v1/sessions/${session.id}`)).json()).data;
    expect(s.linked_task_id).toBeNull();
    expect(s.linked_story_id).toBe(story.id);
  });

  test("deleting a milestone removes its attachments and comments and un-assigns its stories without deleting them", async ({
    request,
  }) => {
    const project = await createProject(request);
    const milestone = await createMilestone(request, project.id);
    const story = await createStory(request, project.id, { milestone_id: milestone.id });
    const att = await addAttachment(request, `/v1/milestones/${milestone.id}`);
    const com = await addComment(request, `/v1/milestones/${milestone.id}`);

    expect((await request.delete(`/v1/milestones/${milestone.id}`)).status()).toBe(204);

    await expectGone(request, [
      `/v1/milestones/${milestone.id}`,
      `/v1/attachments/${att.id}`,
      `/v1/comments/${com.id}`,
    ]);
    const storyRes = await request.get(`/v1/stories/${story.id}`);
    expect(storyRes.status()).toBe(200);
    expect((await storyRes.json()).data.milestone_id).toBeNull();
  });

  test("deleting one attachment leaves the container and its other attachments intact", async ({
    request,
  }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const a = await addAttachment(request, `/v1/stories/${story.id}`, "a");
    const b = await addAttachment(request, `/v1/stories/${story.id}`, "b");

    expect((await request.delete(`/v1/attachments/${a.id}`)).status()).toBe(204);

    // The single-attachment delete removes its own file at once, whatever its age.
    expect((await request.get(`/v1/attachments/${a.id}`)).status()).toBe(404);
    expect((await request.get(`/v1/attachments/${a.id}/file`)).status()).toBe(404);
    const fileB = await request.get(`/v1/attachments/${b.id}/file`);
    expect(fileB.status()).toBe(200);
    expect(await fileB.text()).toBe("# body");
  });

  test("deleting a comment keeps its container, and a story delete after it still succeeds", async ({
    request,
  }) => {
    const project = await createProject(request);
    const story = await createStory(request, project.id);
    const parent = await addComment(request, `/v1/stories/${story.id}`);
    const child = await addComment(request, `/v1/stories/${story.id}`, { in_reply_to: parent.id });

    expect((await request.delete(`/v1/comments/${parent.id}`)).status()).toBe(204);
    expect((await request.get(`/v1/stories/${story.id}`)).status()).toBe(200);
    expect((await request.get(`/v1/comments/${child.id}`)).status()).toBe(200);

    expect((await request.delete(`/v1/stories/${story.id}`)).status()).toBe(204);
    expect((await request.get(`/v1/comments/${child.id}`)).status()).toBe(404);
  });

  test("attachments and comments attach to each of the three container kinds and list per container", async ({
    request,
  }) => {
    const project = await createProject(request);
    const milestone = await createMilestone(request, project.id);
    const story = await createStory(request, project.id);
    const task = await createTask(request, story.id);

    for (const path of [
      `/v1/stories/${story.id}`,
      `/v1/tasks/${task.id}`,
      `/v1/milestones/${milestone.id}`,
    ]) {
      const att = await addAttachment(request, path);
      const com = await addComment(request, path);
      const atts = (await (await request.get(`${path}/attachments`)).json()).data;
      const coms = (await (await request.get(`${path}/comments`)).json()).data;
      expect(atts.map((x: any) => x.id), path).toEqual([att.id]);
      expect(coms.map((x: any) => x.id), path).toEqual([com.id]);
    }
  });
});
