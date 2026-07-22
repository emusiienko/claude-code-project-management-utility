/**
 * Application route table.
 *
 * Three nesting levels of layout shells as established in STORY-016 TASK-001:
 *
 *   RootLayout (/)
 *   ├─ index               → RootRedirect (→ /projects/:lastId/stories, or an
 *   │                        empty Task Manager view with the Projects
 *   │                        overlay auto-opened when no project exists yet)
 *   ├─ /sessions           → SessionsPage (no sidebar, no sub-nav)
 *   ├─ /milestones/:id     → MilestoneDetailPage (no sidebar, back-link to project milestones)
 *   ├─ /comments/:id       → CommentsPage (permalink resolver; navigates to the host view)
 *   └─ AppShell (/projects/:projectId/*)
 *      └─ ProjectShell
 *         ├─ index         → redirect to /stories
 *         ├─ /stories      → StoriesPage
 *         │  └─ :storyId  → StorySlideOver
 *         │     └─ tasks/:taskId → TaskDetailModal (TASK-005)
 *         ├─ /board        → BoardPage (TASK-007)
 *         └─ /milestones   → MilestonesPage (placeholder)
 *
 * Projects management and system Config are no longer routes (STORY-022
 * Revision 3, TASK-009): `/projects`, `/settings`, and
 * `/projects/:projectId/settings` are retired. Their content renders only
 * inside the state-driven slide-over overlay owned by RootLayout
 * (`useOverlayStack` + `OverlayHost`), opened via the top-bar Projects/Config
 * triggers — it covers whichever route below is active without unmounting it.
 *
 * All pages are lazy-loaded with React.lazy + Suspense to keep the initial
 * bundle small.
 */

import React, { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "@/app/RootLayout";
import { AppShell } from "@/app/AppShell";
import { ProjectShell } from "@/app/ProjectShell";
import { RootRedirect } from "@/app/RootRedirect";
import { PageLoader } from "@/shared/components/PageLoader";

// ---------------------------------------------------------------------------
// Lazy page imports — code-split at route level
// ---------------------------------------------------------------------------

const StoriesPage = React.lazy(
  () => import("@/features/stories/StoriesPage"),
);
const SessionsPage = React.lazy(
  () => import("@/features/sessions/SessionsPage"),
);
const MilestonesPage = React.lazy(
  () => import("@/features/milestones/MilestonesPage"),
);
const MilestoneDetailPage = React.lazy(
  () => import("@/features/milestones/MilestoneDetailPage"),
);
const CommentsPage = React.lazy(() => import("@/features/comments/CommentsPage"));
const BoardPage = React.lazy(() => import("@/features/board/BoardPage"));
const StorySlideOver = React.lazy(
  () =>
    import("@/features/stories/components/StorySlideOver").then((m) => ({
      default: m.StorySlideOver,
    })),
);
const TaskDetailModal = React.lazy(
  () =>
    import("@/features/tasks/components/TaskDetailModal").then((m) => ({
      default: m.TaskDetailModal,
    })),
);

// ---------------------------------------------------------------------------
// Suspense wrapper applied at the router level so every page benefits
// ---------------------------------------------------------------------------

function SuspendedPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

export const router = createBrowserRouter([
  {
    // Level 1: flat root layout — top bar region + outlet
    path: "/",
    element: <RootLayout />,
    children: [
      // `/` → redirect to last-visited or first project's Stories, or an
      // empty Task Manager view with the Projects overlay auto-opened
      {
        index: true,
        element: <RootRedirect />,
      },

      // Full-page management routes — no sidebar, no sub-nav
      {
        path: "sessions",
        element: (
          <SuspendedPage>
            <SessionsPage />
          </SuspendedPage>
        ),
      },

      // Milestone detail — top-level route so the URL /milestones/:id is reachable
      // without a project context in the path. The back-link on the page navigates
      // to /projects/:projectId/milestones using the milestone's own project_id.
      {
        path: "milestones/:id",
        element: (
          <SuspendedPage>
            <MilestoneDetailPage />
          </SuspendedPage>
        ),
      },

      // Comment permalink resolver — resolves the comment's host view and
      // navigates there (with scroll-into-view + highlight); root-relative
      // so the backend's `/comments/{id}` contract stays origin-agnostic.
      {
        path: "comments/:id",
        element: (
          <SuspendedPage>
            <CommentsPage />
          </SuspendedPage>
        ),
      },

      // Level 2: AppShell — project sidebar + outlet for all project-scoped routes
      {
        path: "projects/:projectId",
        element: <AppShell />,
        children: [
          // Level 3: ProjectShell — sub-nav tabs + leaf content outlet
          {
            element: <ProjectShell />,
            children: [
              // /projects/:projectId → redirect to /stories tab
              {
                index: true,
                element: <Navigate to="stories" replace />,
              },

              // Stories tab — layout route so the list stays mounted when the
              // story detail slide-over (:storyId child) is active.
              {
                path: "stories",
                element: (
                  <SuspendedPage>
                    <StoriesPage />
                  </SuspendedPage>
                ),
                children: [
                  // Story detail slide-over — nested child route keeps the list
                  // mounted in the background while the slide-over is open.
                  {
                    path: ":storyId",
                    element: (
                      <SuspendedPage>
                        <StorySlideOver />
                      </SuspendedPage>
                    ),
                    children: [
                      // Task Detail modal — nested under the slide-over so both
                      // render simultaneously; direct navigation to this URL
                      // renders the slide-over already open with the modal on top.
                      {
                        path: "tasks/:taskId",
                        element: (
                          <SuspendedPage>
                            <TaskDetailModal />
                          </SuspendedPage>
                        ),
                      },
                    ],
                  },
                ],
              },

              // Board tab — kanban board with drag-and-drop status updates
              {
                path: "board",
                element: (
                  <SuspendedPage>
                    <BoardPage />
                  </SuspendedPage>
                ),
              },

              // Milestones tab — full implementation in STORY-012
              {
                path: "milestones",
                element: (
                  <SuspendedPage>
                    <MilestonesPage />
                  </SuspendedPage>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
]);
