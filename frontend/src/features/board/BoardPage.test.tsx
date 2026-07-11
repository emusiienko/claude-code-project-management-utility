/**
 * BoardPage — unit tests
 *
 * Covers:
 * - Loading state while settings or stories are being fetched.
 * - Error state when stories fail to load.
 * - Empty-statuses state when the project has no story_statuses configured.
 * - Board renders one column heading per effective status.
 * - "Board" heading is present when the board is populated.
 * - Story count summary is displayed.
 *
 * Note: drag-and-drop interaction logic is covered by useBoardDrag.test.ts.
 * This file focuses on BoardPage rendering decisions (guards + column layout).
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import BoardPage from "./BoardPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/features/stories/hooks/useStories", () => ({
  useUpdateStory: vi.fn(),
}));

vi.mock("@/features/settings/hooks/useProjectSettings", () => ({
  useProjectSettingsEffective: vi.fn(),
}));

vi.mock("./hooks/useBoardStories", () => ({
  useBoardStories: vi.fn(),
}));

vi.mock("./hooks/useBoardDrag", () => ({
  useBoardDrag: vi.fn(),
}));

vi.mock("./hooks/useBoardMilestoneFilter", () => ({
  useBoardMilestoneFilter: vi.fn(),
}));

// Mock BoardColumn and BoardCard to avoid dnd-kit DOM hooks in jsdom
vi.mock("./components/BoardColumn", () => ({
  BoardColumn: ({ status, stories }: { status: string; stories: { id: string }[] }) => (
    <div data-testid={`column-${status}`}>
      <h3>{status}</h3>
      {stories.map((s) => (
        <div key={s.id} data-testid={`card-${s.id}`} />
      ))}
    </div>
  ),
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    closestCenter: actual.closestCenter,
  };
});

import { useUpdateStory } from "@/features/stories/hooks/useStories";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { useBoardStories } from "./hooks/useBoardStories";
import { useBoardDrag } from "./hooks/useBoardDrag";
import { useBoardMilestoneFilter } from "./hooks/useBoardMilestoneFilter";

const mockUseUpdateStory = vi.mocked(useUpdateStory);
const mockUseProjectSettingsEffective = vi.mocked(useProjectSettingsEffective);
const mockUseBoardStories = vi.mocked(useBoardStories);
const mockUseBoardDrag = vi.mocked(useBoardDrag);
const mockUseBoardMilestoneFilter = vi.mocked(useBoardMilestoneFilter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderBoardPage(projectId = "proj-001") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${projectId}/board`]}>
        <Routes>
          <Route path="/projects/:projectId/board" element={<BoardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const BOARD_DRAG_NOOP = {
  activeStoryId: null,
  sensors: [],
  handleDragStart: vi.fn(),
  handleDragEnd: vi.fn(),
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const MILESTONE_FILTER_NOOP = {
  selectedMilestoneId: null,
  milestones: [],
  handleSelectMilestone: vi.fn(),
  isLoading: false,
};

beforeEach(() => {
  mockUseUpdateStory.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockUseBoardDrag.mockReturnValue(BOARD_DRAG_NOOP as never);
  mockUseBoardMilestoneFilter.mockReturnValue(MILESTONE_FILTER_NOOP as never);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BoardPage", () => {
  it("shows a loading indicator while settings are loading", () => {
    mockUseProjectSettingsEffective.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);
    mockUseBoardStories.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);
    renderBoardPage();
    const loader = document.querySelector("[aria-busy='true']");
    expect(loader).not.toBeNull();
  });

  it("shows a loading indicator while stories are loading", () => {
    mockUseProjectSettingsEffective.mockReturnValue({
      data: { story_statuses: ["Planned"] },
      isLoading: false,
    } as never);
    mockUseBoardStories.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);
    renderBoardPage();
    const loader = document.querySelector("[aria-busy='true']");
    expect(loader).not.toBeNull();
  });

  it("shows an error alert when stories fail to load", () => {
    mockUseProjectSettingsEffective.mockReturnValue({
      data: { story_statuses: ["Planned"] },
      isLoading: false,
    } as never);
    mockUseBoardStories.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);
    renderBoardPage();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/failed to load stories/i)).toBeInTheDocument();
  });

  it("shows empty-statuses message when no story_statuses are configured", () => {
    mockUseProjectSettingsEffective.mockReturnValue({
      data: { story_statuses: [] },
      isLoading: false,
    } as never);
    mockUseBoardStories.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, page_size: 100 } },
      isLoading: false,
      isError: false,
    } as never);
    renderBoardPage();
    expect(screen.getByText(/no story statuses configured/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /project settings/i })).toBeInTheDocument();
  });

  it("renders one column per effective story status", () => {
    mockUseProjectSettingsEffective.mockReturnValue({
      data: { story_statuses: ["Planned", "In Progress", "Done"] },
      isLoading: false,
    } as never);
    mockUseBoardStories.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, page_size: 100 } },
      isLoading: false,
      isError: false,
    } as never);
    renderBoardPage();
    expect(screen.getByTestId("column-Planned")).toBeInTheDocument();
    expect(screen.getByTestId("column-In Progress")).toBeInTheDocument();
    expect(screen.getByTestId("column-Done")).toBeInTheDocument();
  });

  it("renders the Board heading when the board is populated", () => {
    mockUseProjectSettingsEffective.mockReturnValue({
      data: { story_statuses: ["Planned"] },
      isLoading: false,
    } as never);
    mockUseBoardStories.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, page_size: 100 } },
      isLoading: false,
      isError: false,
    } as never);
    renderBoardPage();
    expect(screen.getByRole("heading", { name: "Board" })).toBeInTheDocument();
  });

  it("displays story count summary", () => {
    mockUseProjectSettingsEffective.mockReturnValue({
      data: { story_statuses: ["Planned"] },
      isLoading: false,
    } as never);
    mockUseBoardStories.mockReturnValue({
      data: {
        data: [
          {
            id: "s-1",
            title: "Story One",
            status: "Planned",
            labels: [],
            project_id: "proj-001",
            content: null,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
        meta: { total: 1, page: 1, page_size: 100 },
      },
      isLoading: false,
      isError: false,
    } as never);
    renderBoardPage();
    // Story count text: "1 story"
    expect(screen.getByText(/1 story/)).toBeInTheDocument();
  });

  it("renders the kanban board region landmark", () => {
    mockUseProjectSettingsEffective.mockReturnValue({
      data: { story_statuses: ["Planned"] },
      isLoading: false,
    } as never);
    mockUseBoardStories.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, page_size: 100 } },
      isLoading: false,
      isError: false,
    } as never);
    renderBoardPage();
    expect(
      screen.getByRole("region", { name: "Story kanban board" }),
    ).toBeInTheDocument();
  });
});
