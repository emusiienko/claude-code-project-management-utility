/**
 * StorySlideOver — unit tests
 *
 * Covers:
 * - Opens as a dialog when storyId is present in the URL.
 * - Close button calls navigate back to the parent stories list.
 * - Escape key fires the close handler.
 * - Back-to-Stories breadcrumb calls navigate.
 * - "Not found" inline message when the story cannot be fetched.
 * - Right-panel persistence key is set per-story.
 * - Resizable kanban/details split (STORY-006 TASK-011): the separator renders
 *   only while the details panel is expanded, a keyboard nudge changes the
 *   panel's rendered width, and a resized width survives closing and
 *   reopening the slide-over within the same session.
 *
 * jsdom implements no `ResizeObserver`, no `setPointerCapture` /
 * `releasePointerCapture`, and performs no layout (`clientWidth` and
 * `getBoundingClientRect()` both read as 0) — stubbed globally on
 * `HTMLElement.prototype` for the resize tests only and restored in
 * `afterEach`, per the jsdom-stub precedent set in TASK-008/TASK-009/
 * TASK-010's own tests.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { StorySlideOver } from "./StorySlideOver";
import { __resetPanelWidths } from "@/shared/hooks/useResizablePanel";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../hooks/useStories", () => ({
  useStory: vi.fn(),
  useUpdateStory: vi.fn(),
}));

vi.mock("@/features/settings/hooks/useProjectSettings", () => ({
  useProjectSettingsEffective: vi.fn(),
}));

// MilestoneAssignment (rendered in StoryRightPanel) calls useProjectMilestones
// which requires a QueryClientProvider. Mock the hook to avoid that dependency.
vi.mock("@/features/milestones/hooks/useMilestones", () => ({
  useProjectMilestones: vi.fn(),
}));

// TaskKanban uses TanStack Query hooks — mock them to avoid requiring a QueryClientProvider.
vi.mock("@/features/tasks/hooks/useTasks", () => ({
  useTaskList: vi.fn(),
  useStoryAggregate: vi.fn(),
  useCreateTask: vi.fn(),
  useUpdateTask: vi.fn(),
  useDeleteTask: vi.fn(),
}));

// StoryLinksSection uses TanStack Query hooks — mock to avoid requiring a QueryClientProvider.
vi.mock("@/features/story-links/hooks/useStoryLinks", () => ({
  useStoryLinkList: vi.fn(),
  useCreateStoryLink: vi.fn(),
  useDeleteStoryLink: vi.fn(),
}));

// AttachmentsSection (rendered in StoryRightPanel, STORY-007) uses TanStack Query
// hooks — mock to avoid requiring a QueryClientProvider.
vi.mock("@/features/attachments/hooks/useAttachments", () => ({
  useAttachmentList: vi.fn(),
  useCreateAttachment: vi.fn(),
  useDeleteAttachment: vi.fn(),
}));

// CommentsSection (rendered in StoryRightPanel, STORY-008) uses TanStack Query
// hooks — mock to avoid requiring a QueryClientProvider.
vi.mock("@/features/comments/hooks/useComments", () => ({
  useCommentList: vi.fn(),
  useCreateComment: vi.fn(),
  useUpdateComment: vi.fn(),
  useDeleteComment: vi.fn(),
}));

import { useStory, useUpdateStory } from "../hooks/useStories";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { useProjectMilestones } from "@/features/milestones/hooks/useMilestones";
import {
  useTaskList,
  useStoryAggregate,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/features/tasks/hooks/useTasks";
import {
  useStoryLinkList,
  useCreateStoryLink,
  useDeleteStoryLink,
} from "@/features/story-links/hooks/useStoryLinks";
import {
  useAttachmentList,
  useCreateAttachment,
  useDeleteAttachment,
} from "@/features/attachments/hooks/useAttachments";
import {
  useCommentList,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/features/comments/hooks/useComments";

const mockUseStory = vi.mocked(useStory);
const mockUseUpdateStory = vi.mocked(useUpdateStory);
const mockUseProjectSettingsEffective = vi.mocked(useProjectSettingsEffective);
const mockUseProjectMilestones = vi.mocked(useProjectMilestones);
const mockUseTaskList = vi.mocked(useTaskList);
const mockUseStoryAggregate = vi.mocked(useStoryAggregate);
const mockUseCreateTask = vi.mocked(useCreateTask);
const mockUseUpdateTask = vi.mocked(useUpdateTask);
const mockUseDeleteTask = vi.mocked(useDeleteTask);
const mockUseStoryLinkList = vi.mocked(useStoryLinkList);
const mockUseCreateStoryLink = vi.mocked(useCreateStoryLink);
const mockUseDeleteStoryLink = vi.mocked(useDeleteStoryLink);
const mockUseAttachmentList = vi.mocked(useAttachmentList);
const mockUseCreateAttachment = vi.mocked(useCreateAttachment);
const mockUseDeleteAttachment = vi.mocked(useDeleteAttachment);
const mockUseCommentList = vi.mocked(useCommentList);
const mockUseCreateComment = vi.mocked(useCreateComment);
const mockUseUpdateComment = vi.mocked(useUpdateComment);
const mockUseDeleteComment = vi.mocked(useDeleteComment);

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const STORY = {
  id: "story-001",
  title: "My Test Story",
  status: "In Progress",
  content: "Some description",
  labels: [],
  project_id: "proj-001",
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// jsdom layout/ResizeObserver/pointer-capture stubs
// ---------------------------------------------------------------------------

/** Large enough that the panel's max (560) and the kanban's min (400) both fit. */
const CONTAINER_WIDTH = 1400;

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubLayout() {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    value: CONTAINER_WIDTH,
  });
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      left: 0,
      right: CONTAINER_WIDTH,
      top: 0,
      bottom: 0,
      width: CONTAINER_WIDTH,
      height: 0,
      x: 0,
      y: 0,
      toJSON() {},
    } as DOMRect;
  };
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
}

function restoreLayout() {
  // @ts-expect-error — restore jsdom's real (0-valued) getter
  delete HTMLElement.prototype.clientWidth;
  // @ts-expect-error — restore jsdom's real (all-zero) implementation
  delete HTMLElement.prototype.getBoundingClientRect;
  vi.unstubAllGlobals();
  // @ts-expect-error — jsdom implements neither method at all
  delete HTMLElement.prototype.setPointerCapture;
  // @ts-expect-error — jsdom implements neither method at all
  delete HTMLElement.prototype.releasePointerCapture;
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}

const SEPARATOR_NAME = "Resize story details panel";

function getRightPanel() {
  return screen.getByRole("complementary", { name: "Story details panel" });
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderSlideOver(
  projectId = "proj-001",
  storyId = "story-001",
) {
  return render(
    <MemoryRouter
      initialEntries={[`/projects/${projectId}/stories/${storyId}`]}
    >
      <Routes>
        <Route
          path="/projects/:projectId/stories"
          element={<div data-testid="stories-list">Stories list</div>}
        />
        <Route
          path="/projects/:projectId/stories/:storyId"
          element={
            <>
              <div data-testid="stories-list">Stories list</div>
              <StorySlideOver />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  __resetPanelWidths();
  stubLayout();
  mockUseStory.mockReturnValue({
    data: STORY as never,
    isLoading: false,
    isError: false,
  } as never);
  mockUseUpdateStory.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
  mockUseProjectSettingsEffective.mockReturnValue({
    data: { story_statuses: ["Planned", "In Progress", "Done"], task_statuses: [], task_types: [], participant_roles: [], link_types: [] },
  } as never);
  // MilestoneAssignment inside StoryRightPanel needs a milestone list
  mockUseProjectMilestones.mockReturnValue({
    data: { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } },
    isLoading: false,
  } as never);
  // TaskKanban hooks — return empty data so the board renders without errors
  mockUseTaskList.mockReturnValue({
    data: { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } },
    isLoading: false,
    isError: false,
  } as never);
  mockUseStoryAggregate.mockReturnValue({
    data: { story_id: "story-001", total_tasks: 0, by_status: {} },
    isLoading: false,
  } as never);
  mockUseCreateTask.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockUseUpdateTask.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockUseDeleteTask.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  // StoryLinksSection hooks — return empty data so the links section renders without errors
  mockUseStoryLinkList.mockReturnValue({
    data: { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } },
    isLoading: false,
    isError: false,
  } as never);
  mockUseCreateStoryLink.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockUseDeleteStoryLink.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  // AttachmentsSection hooks — return empty data so the section renders without errors
  mockUseAttachmentList.mockReturnValue({
    data: { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } },
    isLoading: false,
    isError: false,
  } as never);
  mockUseCreateAttachment.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockUseDeleteAttachment.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  // CommentsSection hooks — return empty data so the section renders without errors
  mockUseCommentList.mockReturnValue({
    data: { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } },
    isLoading: false,
    isError: false,
  } as never);
  mockUseCreateComment.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockUseUpdateComment.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockUseDeleteComment.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
});

afterEach(() => {
  localStorage.clear();
  __resetPanelWidths();
  vi.clearAllMocks();
  restoreLayout();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StorySlideOver", () => {
  it("renders the dialog when a story is loaded", () => {
    renderSlideOver();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("displays the story title in the header", () => {
    renderSlideOver();
    expect(screen.getByText("My Test Story")).toBeInTheDocument();
  });

  it("displays the status badge in the header", () => {
    renderSlideOver();
    // The status badge uses a specific CSS class — there may be multiple "In Progress" texts
    // (header badge + TaskKanbanPlaceholder column heading), so we assert at least one exists.
    const badges = screen.getAllByText("In Progress");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("close button is present with accessible label", () => {
    renderSlideOver();
    expect(
      screen.getByRole("button", { name: "Close story detail" }),
    ).toBeInTheDocument();
  });

  it("breadcrumb button is present", () => {
    renderSlideOver();
    expect(
      screen.getByRole("button", { name: "Back to Stories list" }),
    ).toBeInTheDocument();
  });

  it("Escape key navigates back to the stories list", () => {
    renderSlideOver();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByTestId("stories-list")).toBeInTheDocument();
    // Dialog should be gone after navigation
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("close button navigates back to the stories list", () => {
    renderSlideOver();
    fireEvent.click(screen.getByRole("button", { name: "Close story detail" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("breadcrumb click navigates back to the stories list", () => {
    renderSlideOver();
    fireEvent.click(
      screen.getByRole("button", { name: "Back to Stories list" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows not-found message when the story cannot be fetched", () => {
    mockUseStory.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);
    renderSlideOver("proj-001", "nonexistent-story");
    expect(screen.getByText("Story not found")).toBeInTheDocument();
  });

  it("shows not-found message when story data is undefined and not loading", () => {
    mockUseStory.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);
    renderSlideOver();
    expect(screen.getByText("Story not found")).toBeInTheDocument();
  });

  it("shows loading indicator while fetching", () => {
    mockUseStory.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);
    renderSlideOver();
    // aria-busy is present during loading
    const busyEl = document.querySelector("[aria-busy='true']");
    expect(busyEl).not.toBeNull();
  });

  it("backdrop click navigates back to the stories list", () => {
    renderSlideOver();
    const backdrop = document.querySelector("[aria-hidden='true']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Resizable kanban/details split (STORY-006 TASK-011)
  // -------------------------------------------------------------------------

  it("renders a separator between the kanban and the details panel while it is expanded", () => {
    renderSlideOver();
    expect(
      screen.getByRole("separator", { name: SEPARATOR_NAME }),
    ).toBeInTheDocument();
    expect(getRightPanel()).toBeInTheDocument();
  });

  it("renders no separator while the details panel is collapsed", () => {
    renderSlideOver();
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse details panel" }),
    );

    expect(
      screen.queryByRole("separator", { name: SEPARATOR_NAME }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand details panel" }),
    ).toBeInTheDocument();
  });

  it("a keyboard nudge changes the details panel's rendered width", async () => {
    const user = userEvent.setup();
    renderSlideOver();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });
    separator.focus();

    // side="right": ArrowLeft grows the controlled panel.
    await user.keyboard("{ArrowLeft}");

    expect(getRightPanel()).toHaveStyle({ width: "336px" }); // 320 + NUDGE_STEP_PX(16)
  });

  it("the resized width survives closing and reopening the slide-over within the same session", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSlideOver();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });
    separator.focus();
    await user.keyboard("{ArrowLeft}"); // -> 336px
    expect(getRightPanel()).toHaveStyle({ width: "336px" });

    // Close the slide-over (unmount) and reopen it (fresh mount) — the
    // module-level width map outlives the component, so it isn't a page reload.
    unmount();
    renderSlideOver();

    expect(getRightPanel()).toHaveStyle({ width: "336px" });
  });
});
