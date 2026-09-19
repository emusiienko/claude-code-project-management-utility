/**
 * Component tests for DeleteSessionDialog — STORY-008 (TASK-010).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@/api/types";
import { DeleteSessionDialog } from "./DeleteSessionDialog";

// jsdom does not implement HTMLDialogElement.showModal/close — stub them so
// the component's effect (which calls showModal on mount) does not throw.
// Local to this file per Conventions § Testing (no shared test setup beyond
// vitest.setup.ts's jest-dom import).
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
    archived_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const defaultProps = {
  onConfirm: vi.fn(),
  onClose: vi.fn(),
  isDeleting: false,
};

describe("DeleteSessionDialog", () => {
  it("names the session and states the deletion is permanent", () => {
    const session = makeSession({ topic: "Refine requirements" });
    render(<DeleteSessionDialog {...defaultProps} session={session} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Refine requirements")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("keeps the aria-labelledby/aria-describedby pairing", () => {
    const session = makeSession();
    render(<DeleteSessionDialog {...defaultProps} session={session} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "delete-session-title");
    expect(dialog).toHaveAttribute("aria-describedby", "delete-session-description");
    expect(document.getElementById("delete-session-title")).toBeInTheDocument();
    expect(document.getElementById("delete-session-description")).toBeInTheDocument();
  });

  it("calls onConfirm when the destructive confirm button is clicked", async () => {
    const handleConfirm = vi.fn();
    const session = makeSession();
    render(
      <DeleteSessionDialog {...defaultProps} session={session} onConfirm={handleConfirm} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", async () => {
    const handleClose = vi.fn();
    const session = makeSession();
    render(<DeleteSessionDialog {...defaultProps} session={session} onClose={handleClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("shows the deleting state and disables both buttons while in-flight", () => {
    const session = makeSession();
    render(<DeleteSessionDialog {...defaultProps} session={session} isDeleting />);

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("renders the error message when a delete fails", () => {
    const session = makeSession();
    render(
      <DeleteSessionDialog {...defaultProps} session={session} errorMessage="Session not found" />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Session not found");
  });
});
