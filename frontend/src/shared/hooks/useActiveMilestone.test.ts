/**
 * useActiveMilestone — unit tests
 *
 * Covers:
 * - Returns null when the milestone list is empty (no active milestone).
 * - Returns null when all milestones have status other than "active".
 * - Returns the active Milestone when exactly one has status "active".
 * - Query is disabled (enabled: false) when projectId is an empty string.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { Milestone } from "@/api/types";
import type { ListEnvelope } from "@/api/types";

// ---------------------------------------------------------------------------
// Mock the milestones API endpoint (the only external boundary)
// ---------------------------------------------------------------------------

vi.mock("@/api/endpoints/milestones", () => ({
  listMilestones: vi.fn(),
}));

import { listMilestones } from "@/api/endpoints/milestones";
import { useActiveMilestone } from "./useActiveMilestone";

const mockListMilestones = vi.mocked(listMilestones);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnvelope(milestones: Milestone[]): ListEnvelope<Milestone> {
  return {
    data: milestones,
    meta: { total: milestones.length, page: 1, limit: 100, totalPages: 1 },
  };
}

function makeMilestone(
  id: string,
  status: Milestone["status"],
  name = "Sprint",
): Milestone {
  return {
    id,
    name,
    description: null,
    project_id: "proj-1",
    status,
    story_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useActiveMilestone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the list is empty (no milestones)", async () => {
    mockListMilestones.mockResolvedValueOnce(makeEnvelope([]));

    const { result } = renderHook(
      () => useActiveMilestone("proj-1"),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it("returns null when no milestone has status 'active'", async () => {
    mockListMilestones.mockResolvedValueOnce(
      makeEnvelope([
        makeMilestone("m1", "planned"),
        makeMilestone("m2", "finished"),
      ]),
    );

    const { result } = renderHook(
      () => useActiveMilestone("proj-1"),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it("returns the active Milestone when one has status 'active'", async () => {
    const active = makeMilestone("m-active", "active", "Active Sprint");
    mockListMilestones.mockResolvedValueOnce(
      makeEnvelope([
        makeMilestone("m1", "planned"),
        active,
        makeMilestone("m2", "finished"),
      ]),
    );

    const { result } = renderHook(
      () => useActiveMilestone("proj-1"),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.id).toBe("m-active");
    expect(result.current.data?.status).toBe("active");
  });

  it("does not call listMilestones when projectId is empty string", () => {
    mockListMilestones.mockResolvedValueOnce(makeEnvelope([]));

    const { result } = renderHook(
      () => useActiveMilestone(""),
      { wrapper: makeWrapper() },
    );

    // Query is disabled — fetchStatus should be 'idle', not 'fetching'
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockListMilestones).not.toHaveBeenCalled();
  });
});
