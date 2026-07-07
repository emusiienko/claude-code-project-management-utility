/**
 * Application route table.
 *
 * Top-level routes from the Web UI requirements:
 *   /                       — Projects list (home)
 *   /projects/:projectId    — Stories sub-view for a project (STORY-004)
 *   /sessions               — Sessions list
 *   /settings               — System settings
 *
 * All pages are lazy-loaded with React.lazy + Suspense to keep the initial
 * bundle small. The 3-item top-level nav rule holds — /projects/:projectId
 * is a sub-view, not a nav entry.
 */

import React, { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/app/Layout";
import { PageLoader } from "@/shared/components/PageLoader";

// ---------------------------------------------------------------------------
// Lazy page imports — code-split at route level
// ---------------------------------------------------------------------------

const ProjectsPage = React.lazy(
  () => import("@/features/projects/ProjectsPage"),
);
const StoriesPage = React.lazy(
  () => import("@/features/stories/StoriesPage"),
);
const SessionsPage = React.lazy(
  () => import("@/features/sessions/SessionsPage"),
);
const SettingsPage = React.lazy(
  () => import("@/features/settings/SettingsPage"),
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
    path: "/",
    element: <Layout />,
    children: [
      // Home: Projects list (requirement: route `/`)
      {
        index: true,
        element: (
          <SuspendedPage>
            <ProjectsPage />
          </SuspendedPage>
        ),
      },

      // Stories sub-view: /projects/:projectId — not a top-level nav entry
      {
        path: "projects/:projectId",
        element: (
          <SuspendedPage>
            <StoriesPage />
          </SuspendedPage>
        ),
      },

      {
        path: "sessions",
        element: (
          <SuspendedPage>
            <SessionsPage />
          </SuspendedPage>
        ),
      },
      {
        path: "settings",
        element: (
          <SuspendedPage>
            <SettingsPage />
          </SuspendedPage>
        ),
      },
    ],
  },
]);