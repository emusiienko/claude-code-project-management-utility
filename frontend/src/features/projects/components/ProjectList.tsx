/**
 * ProjectList — renders the paginated list of projects.
 *
 * Handles loading, error, and empty states. Delegates row actions
 * (edit, delete) to the parent via callbacks.
 */

import { Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "@/api/types";
import { IconButton } from "@/shared/components/IconButton";
import { PageLoader } from "@/shared/components/PageLoader";
import { extractErrorMessage } from "@/features/projects/utils/errorMessages";

interface ProjectListProps {
  projects: Project[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

/**
 * Project table with edit/delete actions per row.
 * Shows accessible loading, error, and empty states.
 */
export function ProjectList({
  projects,
  isLoading,
  isError,
  error,
  onEdit,
  onDelete,
}: ProjectListProps) {
  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <p
        role="alert"
        className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error"
      >
        Failed to load projects: {extractErrorMessage(error)}
      </p>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div
        aria-live="polite"
        className="flex h-48 flex-col items-center justify-center rounded-md border border-dashed border-border"
      >
        <p className="text-sm font-medium text-text-secondary">No projects yet</p>
        <p className="mt-1 text-xs text-text-muted">
          Create your first project to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-text-secondary"
            >
              Name
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-left font-medium text-text-secondary sm:table-cell"
            >
              Description
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right font-medium text-text-secondary"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              className="border-b border-border last:border-0 hover:bg-surface-muted/50"
            >
              <td className="px-4 py-3 font-medium text-text">
                <Link
                  to={`/projects/${project.id}`}
                  className="text-brand-600 hover:text-brand-700 hover:underline"
                >
                  {project.name}
                </Link>
              </td>
              <td className="hidden px-4 py-3 text-text-secondary sm:table-cell">
                {project.description ? (
                  <span className="line-clamp-2">{project.description}</span>
                ) : (
                  <span className="italic text-text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <IconButton
                    Icon={Pencil}
                    label={`Edit ${project.name}`}
                    onClick={() => onEdit(project)}
                  />
                  <IconButton
                    Icon={Trash2}
                    label={`Delete ${project.name}`}
                    intent="destructive"
                    onClick={() => onDelete(project)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
