/**
 * Application route table.
 *
 * Only the 3 top-level routes from the Web UI requirements are registered here:
 *   /          — Projects & Milestones (home)
 *   /sessions  — Sessions list
 *   /settings  — System settings
 *
 * Sub-routes under /projects/:id/... (Stories, Tasks, Milestones, etc.) are
 * added when those screens are implemented. All screens are lazy-loaded with
 * React.lazy + Suspense to keep the initial bundle small.
 */

import React, { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/core/Layout";
import { PageLoader } from "@/shared/ui/PageLoader";

// ---------------------------------------------------------------------------
// Lazy screen imports — code-split at route level
// ---------------------------------------------------------------------------

const ProjectsScreen = React.lazy(
  () => import("@/screens/projects/index"),
);
const SessionsScreen = React.lazy(
  () => import("@/screens/sessions/index"),
);
const SettingsScreen = React.lazy(
  () => import("@/screens/settings/index"),
);

// ---------------------------------------------------------------------------
// Suspense wrapper applied at the router level so every screen benefits
// ---------------------------------------------------------------------------

function SuspendedScreen({ children }: { children: React.ReactNode }) {
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
          <SuspendedScreen>
            <ProjectsScreen />
          </SuspendedScreen>
        ),
      },

      {
        path: "sessions",
        element: (
          <SuspendedScreen>
            <SessionsScreen />
          </SuspendedScreen>
        ),
      },
      {
        path: "settings",
        element: (
          <SuspendedScreen>
            <SettingsScreen />
          </SuspendedScreen>
        ),
      },
    ],
  },
]);
