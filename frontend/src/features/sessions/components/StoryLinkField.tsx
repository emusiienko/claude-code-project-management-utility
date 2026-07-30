/**
 * StoryLinkField — picks an optional link to a story within the active
 * project, for the Session create form and detail edit form.
 *
 * Independent of TaskLinkField: a session may hold a story link, a task
 * link, both, or neither at the same time, so this control only ever reads
 * and writes `linked_story_id`.
 */

import { useStories } from "@/features/stories/hooks/useStories";
import { SelectField } from "@/shared/components/SelectField";

interface StoryLinkFieldProps {
  /** Active project — scopes the story selector. */
  projectId: string;
  value: string | null;
  onChange: (storyId: string | null) => void;
  disabled?: boolean;
}

const selectClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

/** Controlled optional story-link selector, independent of the task link. */
export function StoryLinkField({
  projectId,
  value,
  onChange,
  disabled = false,
}: StoryLinkFieldProps) {
  const { data: storiesEnvelope } = useStories(projectId, {}, 1);
  const stories = storiesEnvelope?.data ?? [];

  return (
    <div>
      <label
        htmlFor="session-linked-story"
        className="mb-1 block text-xs font-medium text-text-secondary"
      >
        Linked story (optional)
      </label>
      <SelectField
        id="session-linked-story"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className={selectClass}
      >
        <option value="">None</option>
        {stories.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
