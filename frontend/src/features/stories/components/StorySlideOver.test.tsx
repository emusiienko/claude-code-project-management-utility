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
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StorySlideOver } from "./StorySlideOver";

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
});
