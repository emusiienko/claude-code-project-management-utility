/**
 * Application route table.
 *
 * Only the 3 top-level routes from the Web UI requirements are registered here:
 *   /          — Projects & Milestones (home)
 *   /sessions  — Sessions list
 *   /settings  — System settings
 *
 * Sub-routes under /projects/:id/... (Stories, Tasks, Milestones, etc.) are
 * added when those features are implemented. All pages are lazy-loaded with
 * React.lazy + Suspense to keep the initial bundle small.
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
      // Home: Projects & Milestones combined view (requirement: route `/`)
      {
        index: true,
        element: (
          <SuspendedPage>
            <ProjectsPage />
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