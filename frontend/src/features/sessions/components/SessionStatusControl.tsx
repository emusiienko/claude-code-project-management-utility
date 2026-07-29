/**
 * SessionStatusControl — three-way status selector for the Session Detail
 * view, replacing the former "Mark complete / Mark incomplete" toggle.
 *
 * Settable to any of the three fixed values (`pending` / `in-progress` /
 * `finished`) at any time, in any direction — each selection is an update of
 * `status` alone, independent of every other field.
 */

import type { SessionStatus } from "@/api/types";
import { SESSION_STATUS_LABELS } from "./SessionStatusBadge";

const ALL_SESSION_STATUSES: SessionStatus[] = ["pending", "in-progress", "finished"];

const selectClass =
  "rounded border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

interface SessionStatusControlProps {
  status: SessionStatus;
  onChange: (status: SessionStatus) => void;
  disabled?: boolean;
}

export function SessionStatusControl({
  status,
  onChange,
  disabled = false,
}: SessionStatusControlProps) {
  return (
    <select
      aria-label="Session status"
      value={status}
      onChange={(e) => onChange(e.target.value as SessionStatus)}
      disabled={disabled}
      className={selectClass}
    >
      {ALL_SESSION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {SESSION_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
