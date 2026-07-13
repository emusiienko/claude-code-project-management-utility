/**
 * StoryLinksSection — live Links section for the Story slide-over right panel.
 *
 * Renders all outbound and inbound story links with:
 * - Direction indicator (→ outbound, ← inbound)
 * - link_type badge
 * - Linked story title as a clickable link that opens that story's slide-over
 * - Per-row delete button with confirmation dialog
 * - Add-link form toggled by an "Add link" button
 *
 * @param storyId         - The story whose links are shown.
 * @param projectId       - Owning project; used for target story selector and navigation.
 * @param linkTypeOptions - Effective link_types from the project settings (no extra fetch).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import { getLinkLabel, getLinkOptions } from "@/shared/utils/linkLabels";
import type { EnrichedStoryLink } from "@/api/types";
import type { Direction } from "@/shared/utils/linkLabels";
import {
  useStoryLinkList,
  useCreateStoryLink,
  useDeleteStoryLink,
} from "@/features/story-links/hooks/useStoryLinks";
import { AddStoryLinkForm } from "./AddStoryLinkForm";
import { DeleteStoryLinkDialog } from "./DeleteStoryLinkDialog";

interface StoryLinksSectionProps {
  storyId: string;
  projectId: string;
  linkTypeOptions: string[];
}

interface DeleteTarget {
  linkId: string;
  linkType: string;
  linkedTitle: string;
}

/**
 * Full Links section: list of enriched story link rows + add-link form + delete dialog.
 */
export function StoryLinksSection({
  storyId,
  projectId,
  linkTypeOptions,
}: StoryLinksSectionProps) {
  const navigate = useNavigate();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [addError, setAddError] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: linksEnvelope, isLoading, isError } = useStoryLinkList(storyId);
  const createMutation = useCreateStoryLink(storyId);
  const deleteMutation = useDeleteStoryLink(storyId);

  const links: EnrichedStoryLink[] = linksEnvelope?.data ?? [];
  const expandedLinkOptions = getLinkOptions(linkTypeOptions);

  function handleNavigateToLinkedStory(linkedStoryId: string) {
    navigate(`/projects/${projectId}/stories/${linkedStoryId}`);
  }

  function handleCreate(targetStoryId: string, linkType: string, direction: Direction) {
    setAddError(undefined);
    // Inbound direction: the selected story is the source, the current story is the target.
    const mutationData =
      direction === "inbound"
        ? {
            sourceStoryId: targetStoryId,
            target_story_id: storyId,
            link_type: linkType,
          }
        : { target_story_id: targetStoryId, link_type: linkType };
    createMutation.mutate(mutationData, {
      onSuccess: () => {
        setIsAddFormOpen(false);
        setAddError(undefined);
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : "Failed to add link.";
        setAddError(message);
      },
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.linkId, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex h-10 items-center justify-center"
        aria-busy="true"
        aria-label="Loading links"
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <p role="alert" className="text-xs text-status-error">
        Could not load links.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Link rows */}
      {links.length === 0 && !isAddFormOpen ? (
        <p className="text-xs italic text-text-muted">No links yet.</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Story links">
          {links.map((link) => {
            const isOutbound = link.direction === "outbound";
            const directionSymbol = isOutbound ? "→" : "←";
            const directionLabel = isOutbound ? "outbound" : "inbound";
            const linkedStory = link.linked_story;

            return (
              <li
                key={link.id}
                className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2 py-1"
              >
                {/* Direction indicator */}
                <span
                  aria-label={`Direction: ${directionLabel}`}
                  className="shrink-0 text-xs font-bold text-text-muted"
                >
                  {directionSymbol}
                </span>

                {/* Link type badge */}
                <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 border border-brand-100">
                  {getLinkLabel(link.link_type, link.direction)}
                </span>

                {/* Linked story title — clickable navigation */}
                <button
                  type="button"
                  onClick={() => handleNavigateToLinkedStory(linkedStory.id)}
                  className="min-w-0 flex-1 truncate text-left text-xs text-brand-600 underline hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 rounded"
                  aria-label={`Open story: ${linkedStory.title}`}
                  title={linkedStory.title}
                >
                  {linkedStory.title}
                </button>

                {/* Delete button */}
                <IconButton
                  Icon={Trash2}
                  label={`Remove ${getLinkLabel(link.link_type, link.direction)} link to ${linkedStory.title}`}
                  intent="destructive"
                  onClick={() =>
                    setDeleteTarget({
                      linkId: link.id,
                      linkType: link.link_type,
                      linkedTitle: linkedStory.title,
                    })
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Add link form */}
      {isAddFormOpen ? (
        <AddStoryLinkForm
          projectId={projectId}
          currentStoryId={storyId}
          linkTypeOptions={expandedLinkOptions}
          isSubmitting={createMutation.isPending}
          errorMessage={addError}
          onCreate={handleCreate}
          onCancel={() => {
            setIsAddFormOpen(false);
            setAddError(undefined);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center gap-1 self-start rounded-md border border-dashed border-border px-2 py-1 text-xs text-text-secondary hover:border-brand-400 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <Plus size={12} aria-hidden="true" />
          <span>Add link</span>
        </button>
      )}

      {/* Delete confirmation dialog */}
      <DeleteStoryLinkDialog
        isOpen={deleteTarget !== null}
        linkType={deleteTarget?.linkType ?? ""}
        linkedTitle={deleteTarget?.linkedTitle ?? ""}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
