/**
 * StoryRightPanel — collapsible right panel inside the Story Detail slide-over.
 *
 * Shows:
 *   - Story description rendered as Markdown (via react-markdown)
 *   - Milestone assignment control (inline set/clear)
 *   - Story links section (list + add + delete) — STORY-006
 *   - Attachments section (list + upload + view/download + delete) — STORY-007
 *   - Comments section (thread + add/edit/reply/delete/copy-link) — STORY-008
 *
 * The panel is toggled by the parent; its open/closed state is persisted per
 * story in localStorage (managed by the parent via useLocalStorage).
 *
 * @param story                    - The story whose description is rendered.
 * @param isOpen                   - Whether the panel is currently expanded.
 * @param onToggle                 - Callback to toggle open/closed state.
 * @param onMilestoneAssign        - Called when the user changes the milestone assignment.
 * @param isMilestoneUpdatePending - True while the parent's update mutation is in flight.
 * @param linkTypeEntries          - Structured link_types entries from effective project settings (no extra fetch).
 */

import ReactMarkdown from "react-markdown";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Story, LinkTypeEntry } from "@/api/types";
import { MilestoneAssignment } from "./MilestoneAssignment";
import { StoryLinksSection } from "@/features/story-links/components/StoryLinksSection";
import { AttachmentsSection } from "@/features/attachments/components/AttachmentsSection";
import { CommentsSection } from "@/features/comments/components/CommentsSection";

interface StoryRightPanelProps {
  /** Story data to display. */
  story: Story;
  /** Whether the right panel is visible. */
  isOpen: boolean;
  /** Toggles the panel open or closed. */
  onToggle: () => void;
  /** Called when the user sets or clears the story's milestone assignment. */
  onMilestoneAssign: (milestoneId: string | null) => void;
  /** True while the parent's milestone update mutation is in flight. */
  isMilestoneUpdatePending?: boolean;
  /** Structured link_types entries from the effective project settings — no extra fetch needed. */
  linkTypeEntries?: LinkTypeEntry[];
}

/**
 * Collapsible right panel with story description (Markdown), milestone assignment,
 * story links (STORY-006), attachments (STORY-007), and comments (STORY-008).
 */
export function StoryRightPanel({
  story,
  isOpen,
  onToggle,
  onMilestoneAssign,
  isMilestoneUpdatePending = false,
  linkTypeEntries = [],
}: StoryRightPanelProps) {
  return (
    <aside
      aria-label="Story details panel"
      className={`relative flex shrink-0 flex-col border-l border-border bg-surface transition-all duration-300 ${
        isOpen ? "w-80" : "w-10"
      }`}
    >
      {/* Toggle button — always visible on the panel's left edge */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? "Collapse details panel" : "Expand details panel"}
        title={isOpen ? "Collapse details panel" : "Expand details panel"}
        className="absolute -left-3.5 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface shadow-sm hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        {isOpen ? (
          <ChevronRight size={14} aria-hidden="true" />
        ) : (
          <ChevronLeft size={14} aria-hidden="true" />
        )}
      </button>

      {/* Panel content — hidden when collapsed */}
      {isOpen && (
        <div className="flex flex-1 flex-col overflow-y-auto p-4 gap-6">
          {/* Description section */}
          <section aria-labelledby="story-description-heading">
            <h3
              id="story-description-heading"
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary"
            >
              Description
            </h3>
            {story.content ? (
              <div className="text-sm text-text [&_a]:text-brand-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:my-2 [&_ol]:list-decimal [&_p]:mb-2 [&_p]:last:mb-0 [&_pre]:my-2 [&_pre]:rounded-md [&_pre]:bg-surface-muted [&_pre]:p-3 [&_pre]:text-xs [&_ul]:my-2 [&_ul]:list-disc">
                <ReactMarkdown>{story.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs italic text-text-muted">No description provided.</p>
            )}
          </section>

          {/* Milestone assignment section */}
          <section aria-labelledby="story-milestone-heading">
            <h3
              id="story-milestone-heading"
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary"
            >
              Milestone
            </h3>
            <MilestoneAssignment
              projectId={story.project_id}
              milestoneId={story.milestone_id}
              isPending={isMilestoneUpdatePending}
              onAssign={onMilestoneAssign}
            />
          </section>

          {/* Links section — STORY-006 */}
          <section aria-labelledby="story-links-heading">
            <h3
              id="story-links-heading"
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary"
            >
              Links
            </h3>
            <StoryLinksSection
              storyId={story.id}
              projectId={story.project_id}
              linkTypeEntries={linkTypeEntries}
            />
          </section>

          {/* Attachments section — STORY-007 */}
          <AttachmentsSection
            containerType="story"
            containerId={story.id}
            projectId={story.project_id}
          />

          {/* Comments section — STORY-008 */}
          <CommentsSection containerType="story" containerId={story.id} projectId={story.project_id} />
        </div>
      )}
    </aside>
  );
}
