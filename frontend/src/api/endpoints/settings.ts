/**
 * Settings endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API endpoint.
 * Each function unwraps the response envelope and returns the domain type directly.
 * TanStack Query hooks in src/api/settings.ts consume these functions.
 *
 * Endpoints covered (docs/api-contract.md v1.0):
 *   GET    /v1/system/settings
 *   PUT    /v1/system/settings
 *   GET    /v1/projects/:id/settings
 *   GET    /v1/projects/:id/settings/effective
 *   PUT    /v1/projects/:id/settings
 *   DELETE /v1/projects/:id/settings/:key
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type { Envelope, Settings, SettingsKey, SettingsOverrides } from "@/api/types";

// ---------------------------------------------------------------------------
// System settings
// ---------------------------------------------------------------------------

/** GET /v1/system/settings — all six system dictionary values. */
export async function getSystemSettings(): Promise<Settings> {
  const envelope = await apiClient.get<Envelope<Settings>>(API_PATHS.SYSTEM_SETTINGS);
  return envelope.data;
}

/** PUT /v1/system/settings — updates one or more system dictionary keys. */
export async function updateSystemSettings(
  body: SettingsOverrides,
): Promise<Settings> {
  const envelope = await apiClient.put<Envelope<Settings>>(API_PATHS.SYSTEM_SETTINGS, body);
  return envelope.data;
}

// ---------------------------------------------------------------------------
// Project settings — stored overrides only
// ---------------------------------------------------------------------------

/** GET /v1/projects/:projectId/settings — stored project overrides (empty object when none). */
export async function getProjectSettings(projectId: string): Promise<SettingsOverrides> {
  const envelope = await apiClient.get<Envelope<SettingsOverrides>>(
    API_PATHS.PROJECT_SETTINGS(projectId),
  );
  return envelope.data;
}

// ---------------------------------------------------------------------------
// Project settings — effective (system defaults merged with overrides)
// ---------------------------------------------------------------------------

/** GET /v1/projects/:projectId/settings/effective — merged effective settings. */
export async function getProjectSettingsEffective(projectId: string): Promise<Settings> {
  const envelope = await apiClient.get<Envelope<Settings>>(
    API_PATHS.PROJECT_SETTINGS_EFFECTIVE(projectId),
  );
  return envelope.data;
}

// ---------------------------------------------------------------------------
// Project settings — mutations
// ---------------------------------------------------------------------------

/** PUT /v1/projects/:projectId/settings — sets one or more project-level overrides. */
export async function setProjectOverride(
  projectId: string,
  body: SettingsOverrides,
): Promise<Settings> {
  const envelope = await apiClient.put<Envelope<Settings>>(
    API_PATHS.PROJECT_SETTINGS(projectId),
    body,
  );
  return envelope.data;
}

/** DELETE /v1/projects/:projectId/settings/:key — clears a single project override. */
export async function clearProjectOverride(
  projectId: string,
  key: SettingsKey,
): Promise<void> {
  await apiClient.delete(API_PATHS.PROJECT_SETTINGS_KEY(projectId, key));
}