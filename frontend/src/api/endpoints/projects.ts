/**
 * Projects endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API endpoint.
 * Each function unwraps the response envelope and returns the domain type directly.
 * TanStack Query hooks in src/features/projects/hooks/ consume these functions.
 *
 * Endpoints covered (docs/api-contract.md v1.0):
 *   GET    /v1/projects
 *   POST   /v1/projects
 *   GET    /v1/projects/:id
 *   PUT    /v1/projects/:id
 *   DELETE /v1/projects/:id
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type {
  CreateProject,
  Envelope,
  ListEnvelope,
  Project,
  UpdateProject,
} from "@/api/types";

/** GET /v1/projects — returns the project list up to `limit` items. */
export async function getProjects(limit = 100): Promise<Project[]> {
  const envelope = await apiClient.get<ListEnvelope<Project>>(API_PATHS.PROJECTS, { limit });
  return envelope.data;
}

/** POST /v1/projects — creates a new project and returns the created resource. */
export async function createProject(body: CreateProject): Promise<Project> {
  const envelope = await apiClient.post<Envelope<Project>>(API_PATHS.PROJECTS, body);
  return envelope.data;
}

/** GET /v1/projects/:id — returns a single project by ID. */
export async function getProject(id: string): Promise<Project> {
  const envelope = await apiClient.get<Envelope<Project>>(API_PATHS.PROJECT(id));
  return envelope.data;
}

/** PUT /v1/projects/:id — updates name and/or description. Returns the updated resource. */
export async function updateProject(id: string, body: UpdateProject): Promise<Project> {
  const envelope = await apiClient.put<Envelope<Project>>(API_PATHS.PROJECT(id), body);
  return envelope.data;
}

/** DELETE /v1/projects/:id — permanently removes the project and all nested data. Returns null (204). */
export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(API_PATHS.PROJECT(id));
}
