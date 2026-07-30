/**
 * SessionForm — create form for a Session.
 *
 * Fields: topic (required), goal (required — the purpose the session was
 * created for), context (optional), participant_role (required, dictionary
 * dropdown), and two independent optional link controls — a story link and
 * a task link, either/both/neither of which may be set. `project_id` is
 * implicit (supplied by the parent) and there is no status input — every
 * session starts at `pending`.
 *
 * @param projectId    - Active project — scopes the linked-item selectors.
 * @param roleOptions  - Values from the project's effective participant_roles.
 * @param fieldErrors  - Per-field API error messages.
 * @param onSubmit     - Called with the create payload (project_id excluded).
 * @param onCancel     - Called when the user cancels.
 * @param isSubmitting - True while the parent mutation is in flight.
 */

import { useState } from "react";
import { StoryLinkField } from "./StoryLinkField";
import { TaskLinkField } from "./TaskLinkField";
import { validateSessionFields } from "../utils/validateSessionFields";
import type { CreateSession } from "@/api/types";

export type SessionCreatePayload = Omit<CreateSession, "project_id">;

interface SessionFormProps {
  projectId: string;
  roleOptions: string[];
  /** Per-field API error messages (e.g. 422 validation) — merged with client-side required-field checks. */
  fieldErrors?: Record<string, string>;
  onSubmit: (values: SessionCreatePayload) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const inputClass =
  "w-full rounded border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

const selectClass =
  "w-full rounded border bg-surface px-3 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

const errorClass = "mt-0.5 text-xs text-status-error";

/** Border turns red once a field has a client-side or API error. */
function borderClass(hasError: boolean): string {
  return hasError ? "border-status-error" : "border-border";
}

/** Controlled create form for a Session entity. */
export function SessionForm({
  projectId,
  roleOptions,
  fieldErrors = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SessionFormProps) {
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [participantRole, setParticipantRole] = useState(roleOptions[0] ?? "");
  const [linkedStoryId, setLinkedStoryId] = useState<string | null>(null);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string | undefined>>({});

  const topicError = clientErrors.topic ?? fieldErrors.topic;
  const goalError = clientErrors.goal ?? fieldErrors.goal;
  const roleError = clientErrors.participant_role ?? fieldErrors.participant_role;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateSessionFields({ topic, goal, participantRole });
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }
    setClientErrors({});
    onSubmit({
      topic: topic.trim(),
      goal: goal.trim(),
      context: context.trim() || undefined,
      participant_role: participantRole,
      linked_story_id: linkedStoryId ?? undefined,
      linked_task_id: linkedTaskId ?? undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Topic */}
      <div>
        <label htmlFor="session-topic" className="mb-1 block text-xs font-medium text-text-secondary">
          Topic <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <input
          id="session-topic"
          type="text"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            if (clientErrors.topic) setClientErrors((ce) => ({ ...ce, topic: undefined }));
          }}
          maxLength={500}
          required
          disabled={isSubmitting}
          placeholder="What is this session called?"
          aria-required="true"
          aria-invalid={Boolean(topicError)}
          aria-describedby={topicError ? "session-topic-error" : undefined}
          className={`${inputClass} ${borderClass(Boolean(topicError))}`}
        />
        {topicError && (
          <p id="session-topic-error" role="alert" className={errorClass}>
            {topicError}
          </p>
        )}
      </div>

      {/* Goal */}
      <div>
        <label htmlFor="session-goal" className="mb-1 block text-xs font-medium text-text-secondary">
          Goal <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <textarea
          id="session-goal"
          value={goal}
          onChange={(e) => {
            setGoal(e.target.value);
            if (clientErrors.goal) setClientErrors((ce) => ({ ...ce, goal: undefined }));
          }}
          maxLength={500}
          required
          disabled={isSubmitting}
          rows={2}
          placeholder="What is this session meant to accomplish?"
          aria-required="true"
          aria-invalid={Boolean(goalError)}
          aria-describedby={goalError ? "session-goal-error" : undefined}
          className={`${inputClass} resize-y ${borderClass(Boolean(goalError))}`}
        />
        {goalError && (
          <p id="session-goal-error" role="alert" className={errorClass}>
            {goalError}
          </p>
        )}
      </div>

      {/* Context */}
      <div>
        <label htmlFor="session-context" className="mb-1 block text-xs font-medium text-text-secondary">
          Context (optional)
        </label>
        <textarea
          id="session-context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          placeholder="Broader background for this session"
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Participant role */}
      <div>
        <label
          htmlFor="session-participant-role"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Participant role <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <select
          id="session-participant-role"
          value={participantRole}
          onChange={(e) => {
            setParticipantRole(e.target.value);
            if (clientErrors.participant_role) {
              setClientErrors((ce) => ({ ...ce, participant_role: undefined }));
            }
          }}
          required
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={Boolean(roleError)}
          aria-describedby={roleError ? "session-participant-role-error" : undefined}
          className={`${selectClass} ${borderClass(Boolean(roleError))}`}
        >
          <option value="" disabled>
            Select a role
          </option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {roleError && (
          <p id="session-participant-role-error" role="alert" className={errorClass}>
            {roleError}
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
          disabled={isSubmitting}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
