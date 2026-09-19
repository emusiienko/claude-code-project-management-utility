/**
 * Component tests for SessionDetailPage — STORY-008 (TASK-011).
 *
 * Covers the archived-only delete action gate on the detail page's action
 * bar, and the post-delete navigation back to the project's session list.
 * The delete mutation's own cache behavior is covered by the hook test in
 * TASK-010 and is not re-asserted here.
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import type { Session } from "@/api/types";
import SessionDetailPage from "./SessionDetailPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("./hooks/useSessions", () => ({
  useSession: vi.fn(),
  useUpdateSession: vi.fn(),
  useArchiveSession: vi.fn(),
  useDeleteSession: vi.fn(),
}));

vi.mock("@/features/settings/hooks/useProjectSettings", () => ({
  useProjectSettingsEffective: vi.fn(),
}));

import {
  useSession,
  useUpdateSession,
  useArchiveSession,
  useDeleteSession,
} from "./hooks/useSessions";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";

const mockUseSession = vi.mocked(useSession);
const mockUseUpdateSession = vi.mocked(useUpdateSession);
const mockUseArchiveSession = vi.mocked(useArchiveSession);
const mockUseDeleteSession = vi.mocked(useDeleteSession);
const mockUseProjectSettingsEffective = vi.mocked(useProjectSettingsEffective);

// jsdom does not implement HTMLDialogElement.showModal/close — stub them so
// DeleteSessionDialog/ArchiveSessionDialog's mount effect does not throw.
// Local to this file per Conventions § Testing.
const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
  };
});

afterAll(() => {
  HTMLDialogElement.prototype.showModal = originalShowModal;
  HTMLDialogElement.prototype.close = originalClose;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides?: Partial<Session>): Session {
  return {
    id: "session-1",
    project_id: "proj-1",
    topic: "Refine requirements",
    goal: "Scope the story",
    context: null,
    status: "finished",
    participant_role: "business-analyst",
    result_decisions: null,
    result_summary: null,
    linked_story_id: null,
    linked_task_id: null,
    archived_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderDetailPage() {
  return render(
    <MemoryRouter initialEntries={["/sessions/proj-1/session-1"]}>
      <Routes>
        <Route path="/sessions/:projectId/:sessionId" element={<SessionDetailPage />} />
        <Route path="/sessions/:projectId" element={<div>Session list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProjectSettingsEffective.mockReturnValue({
    data: { participant_roles: [] },
  } as never);
  mockUseUpdateSession.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  } as never);
  mockUseArchiveSession.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SessionDetailPage — delete action", () => {
  it("renders no delete control when the session is not archived", () => {
    mockUseSession.mockReturnValue({
      data: makeSession({ archived_at: null }),
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    mockUseDeleteSession.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    renderDetailPage();

    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("renders a delete action in the action bar when the session is archived", () => {
    mockUseSession.mockReturnValue({
      data: makeSession({ archived_at: "2026-02-01T00:00:00Z" }),
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    mockUseDeleteSession.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    renderDetailPage();

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("navigates to the project's session list after a successful delete", async () => {
    const session = makeSession({ archived_at: "2026-02-01T00:00:00Z" });
    mockUseSession.mockReturnValue({
      data: session,
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    const mutate = vi.fn((_sessionId, { onSuccess }: { onSuccess: () => void }) => onSuccess());
    mockUseDeleteSession.mockReturnValue({ mutate, isPending: false } as never);

    renderDetailPage();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

    expect(mutate).toHaveBeenCalledWith("session-1", expect.any(Object));
    expect(screen.getByText("Session list")).toBeInTheDocument();
  });

  it("stays on the detail page with the error shown and the dialog open when delete fails", async () => {
    const session = makeSession({ archived_at: "2026-02-01T00:00:00Z" });
    mockUseSession.mockReturnValue({
      data: session,
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    const mutate = vi.fn((_sessionId, { onError }: { onError: (err: unknown) => void }) =>
      onError(new Error("boom")),
    );
    mockUseDeleteSession.mockReturnValue({ mutate, isPending: false } as never);

    renderDetailPage();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

    expect(screen.queryByText("Session list")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });
});
