/**
 * Component tests for SessionList — STORY-008 (TASK-010).
 *
 * Covers the archived-only delete action gate: an archived row exposes a
 * delete control with an accessible name naming the session; a non-archived
 * row has no delete control anywhere in the DOM (not a disabled one).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import type { Session } from "@/api/types";
import { SessionList } from "./SessionList";

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

const defaultProps = {
  projectId: "proj-1",
  isLoading: false,
  isError: false,
  error: null,
  onArchive: vi.fn(),
  onDelete: vi.fn(),
};

function renderList(
  props: { sessions: Session[] } & Partial<React.ComponentProps<typeof SessionList>>
) {
  return render(
    <MemoryRouter>
      <SessionList {...defaultProps} {...props} />
    </MemoryRouter>
  );
}

describe("SessionList", () => {
  it("renders no delete control for a non-archived session", () => {
    const session = makeSession({ topic: "Alpha", archived_at: null });
    renderList({ sessions: [session] });

    expect(screen.getByRole("button", { name: "Archive Alpha" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Alpha" })).not.toBeInTheDocument();
  });

  it("renders a delete control naming the session for an archived session", () => {
    const session = makeSession({ topic: "Bravo", archived_at: "2026-02-01T00:00:00Z" });
    renderList({ sessions: [session] });

    expect(screen.getByRole("button", { name: "Delete Bravo" })).toBeInTheDocument();
  });

  it("calls onDelete with the correct session when its delete icon is clicked", async () => {
    const handleDelete = vi.fn();
    const session = makeSession({ topic: "Charlie", archived_at: "2026-02-01T00:00:00Z" });
    renderList({ sessions: [session], onDelete: handleDelete });

    await userEvent.click(screen.getByRole("button", { name: "Delete Charlie" }));

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(session);
  });

  it("routes the delete action to the correct row when both archived and non-archived rows are present", () => {
    const archived = makeSession({
      id: "session-archived",
      topic: "Archived one",
      archived_at: "2026-02-01T00:00:00Z",
    });
    const active = makeSession({ id: "session-active", topic: "Active one", archived_at: null });
    renderList({ sessions: [archived, active] });

    expect(screen.getByRole("button", { name: "Delete Archived one" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Active one" })).not.toBeInTheDocument();
  });
});
