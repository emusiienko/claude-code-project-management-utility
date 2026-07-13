/**
 * AddStoryLinkForm — inline form for creating a directed story link.
 *
 * Renders a target story selector (stories in the same project, current story excluded)
 * and a directional link type dropdown (expanded from getLinkOptions). On submit it
 * calls `onCreate` with the selected values including direction so the parent can
 * swap source/target for inbound selections.
 *
 * @param projectId       - Owning project ID used to fetch the candidate story list.
 * @param currentStoryId  - The story being viewed; excluded from the target selector.
 * @param linkTypeOptions - Expanded link options from getLinkOptions; each has label, linkType, direction.
 * @param isSubmitting    - True while the create mutation is in flight.
 * @param errorMessage    - Inline error message from the create mutation.
 * @param onCreate        - Called with targetStoryId, linkType, direction when the user submits.
 * @param onCancel        - Called when the user discards the form.
 */

import { useState } from "react";
import { useStories } from "@/features/stories/hooks/useStories";
import type { LinkOption, Direction } from "@/shared/utils/linkLabels";

interface AddStoryLinkFormProps {
  projectId: string;
  currentStoryId: string;
  linkTypeOptions: LinkOption[];
  isSubmitting: boolean;
  errorMessage: string | undefined;
  onCreate: (targetStoryId: string, linkType: string, direction: Direction) => void;
  onCancel: () => void;
}

/**
 * Form with a target story `<select>` and a directional link type `<select>`.
 * Candidate stories are fetched once from the project story list and filtered
 * to exclude the current story. The link options come from the parent prop,
 * already in cache — no additional network call.
 */
export function AddStoryLinkForm({
  projectId,
  currentStoryId,
  linkTypeOptions,
  isSubmitting,
  errorMessage,
  onCreate,
  onCancel,
}: AddStoryLinkFormProps) {
  const [targetStoryId, setTargetStoryId] = useState("");
  // Store selected option index to recover both linkType and direction.
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(
    linkTypeOptions.length > 0 ? 0 : -1,
  );

  // Fetch project stories to populate the target selector.
  // Large limit to get all stories in one request.
  const { data: storiesEnvelope, isLoading: isLoadingStories } = useStories(
    projectId,
    undefined,
    1,
  );

  const candidateStories = (storiesEnvelope?.data ?? []).filter(
    (s) => s.id !== currentStoryId,
  );

  const selectedOption =
    selectedOptionIndex >= 0 ? linkTypeOptions[selectedOptionIndex] : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetStoryId || !selectedOption) return;
    onCreate(targetStoryId, selectedOption.linkType, selectedOption.direction);
  }

  const isDisabled = isSubmitting || isLoadingStories;

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      {errorMessage && (
        <p role="alert" className="rounded bg-status-error/10 px-2 py-1 text-xs text-status-error">
          {errorMessage}
        </p>
      )}

      {/* Target story selector */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="story-link-target"
          className="text-xs font-medium text-text-secondary"
        >
          Target story
        </label>
        <select
          id="story-link-target"
          value={targetStoryId}
          onChange={(e) => setTargetStoryId(e.target.value)}
          disabled={isDisabled}
          required
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
        >
          <option value="">
            {isLoadingStories ? "Loading…" : candidateStories.length === 0 ? "No other stories" : "Select a story…"}
          </option>
          {candidateStories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Link type selector */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="story-link-type"
          className="text-xs font-medium text-text-secondary"
        >
          Link type
        </label>
        <select
          id="story-link-type"
          value={selectedOptionIndex >= 0 ? String(selectedOptionIndex) : ""}
          onChange={(e) => setSelectedOptionIndex(Number(e.target.value))}
          disabled={isDisabled || linkTypeOptions.length === 0}
          required
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
        >
          {linkTypeOptions.length === 0 && (
            <option value="">No link types configured</option>
          )}
          {linkTypeOptions.map((opt, idx) => (
            <option key={`${opt.linkType}-${opt.direction}`} value={idx}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-border px-2.5 py-1 text-xs text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isDisabled || !targetStoryId || !selectedOption}
          className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
        >
          {isSubmitting ? "Adding…" : "Add link"}
        </button>
      </div>
    </form>
  );
}
