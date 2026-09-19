/**
 * Unit tests for the Sessions hooks — STORY-008 (TASK-010).
 *
 * Coverage: useDeleteSession — mutationFn argument, list invalidation, and
 * detail-entry removal (not invalidation — the deleted record is gone).
 *
 * Mocks at the module boundary immediately below the hook: @/api/endpoints/sessions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useDeleteSession } from "./useSessions";
import { CACHE_KEYS } from "@/config/cacheConfig";

vi.mock("@/api/endpoints/sessions", () => ({
  archiveSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
  listSessions: vi.fn(),
  updateSession: vi.fn(),
}));

import * as sessionsApi from "@/api/endpoints/sessions";

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const PROJECT_ID = "proj-abc-123";
const SESSION_ID = "session-xyz-456";

describe("useDeleteSession", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls deleteSession with the session id", async () => {
    vi.mocked(sessionsApi.deleteSession).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteSession(PROJECT_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate(SESSION_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sessionsApi.deleteSession).toHaveBeenCalledWith(SESSION_ID);
  });

  it("invalidates the project's session list on success", async () => {
    vi.mocked(sessionsApi.deleteSession).mockResolvedValue(undefined);
    queryClient.setQueryData(CACHE_KEYS.sessions.list(PROJECT_ID), []);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteSession(PROJECT_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate(SESSION_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CACHE_KEYS.sessions.list(PROJECT_ID) })
    );
  });

  it("removes the deleted session's detail cache entry, rather than invalidating it", async () => {
    vi.mocked(sessionsApi.deleteSession).mockResolvedValue(undefined);
    queryClient.setQueryData(CACHE_KEYS.sessions.detail(SESSION_ID), {
      id: SESSION_ID,
      topic: "Old topic",
    });

    const removeSpy = vi.spyOn(queryClient, "removeQueries");

    const { result } = renderHook(() => useDeleteSession(PROJECT_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate(SESSION_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(removeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CACHE_KEYS.sessions.detail(SESSION_ID) })
    );
    expect(queryClient.getQueryData(CACHE_KEYS.sessions.detail(SESSION_ID))).toBeUndefined();
  });
});
