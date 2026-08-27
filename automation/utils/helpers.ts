import type { APIRequestContext } from "@playwright/test";

/**
 * Shared black-box fixture helpers for the Coordination Service test suite.
 * Every helper hits the real REST API (never the DB, never internals) and returns the
 * created resource's `data` payload, per the contract's `Envelope<T>` shape.
 *
 * Each helper appends a random suffix to any uniqueness-constrained field so parallel
 * test workers never collide (see CLAUDE.md — projects/milestones are unique by name).
 */

export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createProject(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
) {
  // NOTE: the /projects collection route requires a trailing slash on this backend to avoid a
  // 307 redirect (unlike every other collection route in the contract) — see automation/README.md
  // § Known Quirks.
  const res = await request.post("/v1/projects/", {
    data: { name: uniqueName("qa-project"), ...overrides },
  });
  if (!res.ok()) {
    throw new Error(`createProject failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).data;
}

export async function createStory(
  request: APIRequestContext,
  projectId: string,
  overrides: Record<string, unknown> = {}
) {
  const res = await request.post("/v1/stories", {
    data: { project_id: projectId, title: uniqueName("qa-story"), ...overrides },
  });
  if (!res.ok()) {
    throw new Error(`createStory failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).data;
}

export async function createTask(
  request: APIRequestContext,
  storyId: string,
  overrides: Record<string, unknown> = {}
) {
  const res = await request.post(`/v1/stories/${storyId}/tasks`, {
    data: {
      title: uniqueName("qa-task"),
      type: "task",
      status: "todo",
      ...overrides,
    },
  });
  if (!res.ok()) {
    throw new Error(`createTask failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).data;
}

export async function createMilestone(
  request: APIRequestContext,
  projectId: string,
  overrides: Record<string, unknown> = {}
) {
  const res = await request.post("/v1/milestones", {
    data: { project_id: projectId, name: uniqueName("qa-milestone"), ...overrides },
  });
  if (!res.ok()) {
    throw new Error(`createMilestone failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).data;
}

export async function createSession(
  request: APIRequestContext,
  projectId: string,
  overrides: Record<string, unknown> = {}
) {
  const res = await request.post("/v1/sessions", {
    data: {
      project_id: projectId,
      topic: uniqueName("qa-topic"),
      goal: uniqueName("qa-goal"),
      participant_role: "operator",
      ...overrides,
    },
  });
  if (!res.ok()) {
    throw new Error(`createSession failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).data;
}

/** Fetches the project's effective participant_roles so tests never hardcode a dictionary value. */
export async function getEffectiveParticipantRole(
  request: APIRequestContext,
  projectId: string
): Promise<string> {
  const res = await request.get(`/v1/projects/${projectId}/settings/effective`);
  if (!res.ok()) {
    throw new Error(`getEffectiveSettings failed: ${res.status()} ${await res.text()}`);
  }
  const settings = (await res.json()).data;
  const roles: string[] = settings.participant_roles ?? [];
  if (roles.length === 0) {
    throw new Error("No effective participant_roles configured — cannot pick a valid role.");
  }
  return roles[0];
}

export async function getEffectiveDictionary(
  request: APIRequestContext,
  projectId: string,
  key: string
): Promise<string[]> {
  const res = await request.get(`/v1/projects/${projectId}/settings/effective`);
  if (!res.ok()) {
    throw new Error(`getEffectiveSettings failed: ${res.status()} ${await res.text()}`);
  }
  const settings = (await res.json()).data;
  return settings[key] ?? [];
}

export const NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000000";
