/**
 * MilestoneDetailPage — detail view at /milestones/:id.
 *
 * Shows the milestone name (as heading), status badge, description, and a
 * paginated list of stories assigned to this milestone. A back-link returns
 * to the owning project's Milestones tab.
 *
 * Data fetching:
 *   - Milestone detail: useMilestone (GET /v1/milestones/:id)
 *   - Assigned stories: useMilestoneStories (GET /v1/milestones/:id/stories)
 *
 * Handles loading, error, and empty states for both queries.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useMilestone, useMilestoneStories } from "./hooks/useMilestones";
import { extractErrorMessage } from "./utils/errorMessages";
import { PageLoader } from "@/shared/components/PageLoader";
import type { MilestoneStatus, Story } from "@/api/types";

// ---------------------------------------------------------------------------
// Status badge (re-implementation local to this page — MilestoneList's badge
// is not exported to prevent cross-feature imports)
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: "Planned",
  active: "Active",
  finished: "Finished",
};

const STATUS_BADGE_CLASSES: Record<MilestoneStatus, string> = {
  planned: "bg-gray-100 text-gray-600",
  active: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 font-semibold",
  finished: "bg-green-50 text-green-700",
};

function StatusBadge({ status }: { status: MilestoneStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs",
        STATUS_BADGE_CLASSES[status],
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stories list sub-component
// ---------------------------------------------------------------------------

interface StoriesListProps {
  stories: Story[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function StoriesList({ stories, total, page, totalPages, onPageChange }: StoriesListProps) {
  if (stories.length === 0) {
    return (
      <div
        aria-live="polite"
        className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16"
      >
        <p className="text-base font-semibold text-text">No stories assigned</p>
        <p className="mt-1 text-sm text-text-secondary">
          Assign stories to this milestone from the Stories tab.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
                Title
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => (
              <tr
                key={story.id}
                className="border-b border-border last:border-0 hover:bg-surface-muted/50"
              >
                <td className="px-4 py-3 font-medium text-text">
                  <Link
                    to={`/projects/${story.project_id}/stories/${story.id}`}
                    className="hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
                  >
                    {story.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{story.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
          <span>
            Page {page} of {totalPages} ({total} stories)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              title="Previous page"
              className="rounded p-1 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              title="Next page"
              className="rounded p-1 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * Milestone detail page — renders milestone info and its assigned stories list.
 * Route: /milestones/:id
 */
export default function MilestoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const milestoneId = id ?? "";

  const [storiesPage, setStoriesPage] = useState(1);

  const {
    data: milestone,
    isLoading: isMilestoneLoading,
    isError: isMilestoneError,
    error: milestoneError,
  } = useMilestone(milestoneId);

  const {
    data: storiesEnvelope,
    isLoading: isStoriesLoading,
    isError: isStoriesError,
    error: storiesError,
  } = useMilestoneStories(milestoneId, storiesPage);

  if (isMilestoneLoading) {
    return <PageLoader />;
  }

  if (isMilestoneError || !milestone) {
    return (
      <div className="p-6">
        <p role="alert" className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error">
          Failed to load milestone: {extractErrorMessage(milestoneError)}
        </p>
      </div>
    );
  }

  const stories = storiesEnvelope?.data ?? [];
  const meta = storiesEnvelope?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  return (
    <div className="p-6">
      {/* Back link to the owning project's Milestones tab */}
      <Link
        to={`/projects/${milestone.project_id}/milestones`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
        aria-label="Back to Milestones"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to Milestones
      </Link>

      {/* Milestone heading and status badge */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-text">{milestone.name}</h1>
        <StatusBadge status={milestone.status} />
      </div>

      {/* Description */}
      {milestone.description ? (
        <p className="mt-3 text-sm text-text-secondary">{milestone.description}</p>
      ) : (
        <p className="mt-3 text-sm italic text-text-muted">No description provided.</p>
      )}

      {/* Assigned stories */}
      <section className="mt-8" aria-labelledby="stories-heading">
        <h2 id="stories-heading" className="mb-4 text-base font-semibold text-text">
          Assigned Stories
        </h2>

        {isStoriesError && (
          <p
            role="alert"
            className="mb-4 rounded bg-status-error/10 px-4 py-3 text-sm text-status-error"
          >
            Failed to load stories: {extractErrorMessage(storiesError)}
          </p>
        )}

        {isStoriesLoading ? (
          <PageLoader />
        ) : (
          <StoriesList
            stories={stories}
            total={total}
            page={storiesPage}
            totalPages={totalPages}
            onPageChange={setStoriesPage}
          />
        )}
      </section>
    </div>
  );
}
