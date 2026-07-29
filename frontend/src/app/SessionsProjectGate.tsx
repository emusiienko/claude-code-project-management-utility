/**
 * SessionsProjectGate — validates the `:projectId` route param for Sessions
 * mode (STORY-009 TASK-006), mirroring ProjectShell's validation for Task
 * Manager. Renders an inline "Not found"/load-error state when the project
 * referenced in the URL doesn't resolve, otherwise renders the nested
 * session list/detail routes.
 */

import { Outlet, useParams } from "react-router-dom";
import { useProjectDetail } from "@/shared/hooks/useProjectDetail";
import { PageLoader } from "@/shared/components/PageLoader";
import { ProjectNotFound } from "@/shared/components/ProjectNotFound";
import { ProjectLoadError } from "@/shared/components/ProjectLoadError";

export function SessionsProjectGate() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId as string;

  const { isLoading, isNotFound, isError } = useProjectDetail(id);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isNotFound) {
    return <ProjectNotFound />;
  }

  if (isError) {
    return <ProjectLoadError />;
  }

  return <Outlet />;
}
