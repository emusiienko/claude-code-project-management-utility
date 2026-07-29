/**
 * SessionEditForm — full-record edit form for the Session Detail view.
 *
 * Edits every updatable field except `status`, which has its own dedicated
 * three-way `SessionStatusControl` in the detail page (kept independent so
 * it can be changed at any time without touching the rest of the record).
 * `topic`, `goal`, and `participant_role` cannot be cleared — submitting
 * requires a non-empty value for each. The other text fields and the two
 * independent link fields are cleared by leaving them empty.
 *
 * @param session      - The session being edited — supplies initial values.
 * @param projectId    - Active project — scopes the linked-item selectors.
 * @param roleOptions  - Values from the project's effective participant_roles.
 * @param fieldErrors  - Per-field API error messages.
 * @param onSubmit     - Called with the full update payload.
 * @param onCancel     - Called when the user cancels.
 * @param isSubmitting - True while the parent mutation is in flight.
 */

import { useState } from "react";
import { StoryLinkField } from "./StoryLinkField";
import { TaskLinkField } from "./TaskLinkField";
import type { Session, UpdateSession } from "@/api/types";

export type SessionEditPayload = Omit<UpdateSession, "status">;

interface SessionEditFormProps {
  session: Session;
  projectId: string;
  roleOptions: string[];
  fieldErrors?: Record<string, string>;
  onSubmit: (values: SessionEditPayload) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const inputClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

const selectClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

const errorClass = "mt-0.5 text-xs text-status-error";

export function SessionEditForm({
  session,
  projectId,
  roleOptions,
  fieldErrors = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SessionEditFormProps) {
  const [topic, setTopic] = useState(session.topic);
  const [goal, setGoal] = useState(session.goal);
  const [context, setContext] = useState(session.context ?? "");
  const [participantRole, setParticipantRole] = useState(session.participant_role);
  const [resultDecisions, setResultDecisions] = useState(session.result_decisions ?? "");
  const [resultSummary, setResultSummary] = useState(session.result_summary ?? "");
  const [linkedStoryId, setLinkedStoryId] = useState<string | null>(session.linked_story_id);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(session.linked_task_id);

  const topicValid = topic.trim().length > 0 && topic.trim().length <= 500;
  const goalValid = goal.trim().length > 0 && goal.trim().length <= 500;
  const roleValid = participantRole.trim().length > 0;
  const canSubmit = topicValid && goalValid && roleValid && !isSubmitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      topic: topic.trim(),
      goal: goal.trim(),
      context: context.trim() ? context.trim() : null,
      participant_role: participantRole,
      result_decisions: resultDecisions.trim() ? resultDecisions.trim() : null,
      result_summary: resultSummary.trim() ? resultSummary.trim() : null,
      linked_story_id: linkedStoryId,
      linked_task_id: linkedTaskId,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Topic */}
      <div>
        <label htmlFor="session-edit-topic" className="mb-1 block text-xs font-medium text-text-secondary">
          Topic <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <input
          id="session-edit-topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={500}
          required
          disabled={isSubmitting}
          aria-describedby={fieldErrors.topic ? "session-edit-topic-error" : undefined}
          className={inputClass}
        />
        {fieldErrors.topic && (
          <p id="session-edit-topic-error" role="alert" className={errorClass}>
            {fieldErrors.topic}
          </p>
        )}
      </div>

      {/* Goal */}
      <div>
        <label htmlFor="session-edit-goal" className="mb-1 block text-xs font-medium text-text-secondary">
          Goal <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <textarea
          id="session-edit-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          maxLength={500}
          required
          disabled={isSubmitting}
          rows={2}
          aria-describedby={fieldErrors.goal ? "session-edit-goal-error" : undefined}
          className={`${inputClass} resize-y`}
        />
        {fieldErrors.goal && (
          <p id="session-edit-goal-error" role="alert" className={errorClass}>
            {fieldErrors.goal}
          </p>
        )}
      </div>

      {/* Context */}
      <div>
        <label htmlFor="session-edit-context" className="mb-1 block text-xs font-medium text-text-secondary">
          Context (optional — leave empty to clear)
        </label>
        <textarea
          id="session-edit-context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Participant role */}
      <div>
        <label
          htmlFor="session-edit-participant-role"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Participant role <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <select
          id="session-edit-participant-role"
          value={participantRole}
          onChange={(e) => setParticipantRole(e.target.value)}
          required
          disabled={isSubmitting}
          aria-describedby={
            fieldErrors.participant_role ? "session-edit-participant-role-error" : undefined
          }
          className={selectClass}
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {fieldErrors.participant_role && (
          <p id="session-edit-participant-role-error" role="alert" className={errorClass}>
            {fieldErrors.participant_role}
          </p>
        )}
      </div>

      {/* Linked story and linked task — independent, both may be set */}
      <StoryLinkField
        projectId={projectId}
        value={linkedStoryId}
        onChange={setLinkedStoryId}
        disabled={isSubmitting}
      />
      <TaskLinkField
        projectId={projectId}
        value={linkedTaskId}
        onChange={setLinkedTaskId}
        disabled={isSubmitting}
      />

      {/* Result decisions */}
      <div>
        <label
          htmlFor="session-edit-result-decisions"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Result — decisions (optional — leave empty to clear)
        </label>
        <textarea
          id="session-edit-result-decisions"
          value={resultDecisions}
          onChange={(e) => setResultDecisions(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Result summary */}
      <div>
        <label
          htmlFor="session-edit-result-summary"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Result — summary (optional — leave empty to clear)
        </label>
        <textarea
          id="session-edit-result-summary"
          value={resultSummary}
          onChange={(e) => setResultSummary(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-border px-4 py-1.5 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
