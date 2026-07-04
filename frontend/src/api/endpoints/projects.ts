/**
 * Projects endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API endpoint.
 * Each function unwraps the response envelope and returns the domain type directly.
 * TanStack Query hooks in src/api/projects.ts consume these functions.
 *
 * Endpoints covered (docs/api-contract.md v1.0):
 *   GET /v1/projects
 *
 * TODO(STORY-003): add createProject, updateProject, deleteProject, getProject
 *   when the Projects screen is implemented.
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type { ListEnvelope, Project } from "@/api/types";

/** GET /v1/projects — returns the project list up to `limit` items. */
export async function getProjects(limit = 100): Promise<Project[]> {
  const envelope = await apiClient.get<ListEnvelope<Project>>(API_PATHS.PROJECTS, { limit });
  return envelope.data;
}