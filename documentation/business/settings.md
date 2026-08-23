# Settings Module

## Happy Path

1. A brand-new project works immediately with no configuration — it inherits the system-level
   defaults for every dictionary.
2. The orchestrator opens the global **Config** overlay to see and edit the system-level defaults
   for five dictionaries (`task_statuses`, `task_types`, `story_statuses`, `link_types`,
   `participant_roles`) plus one single-value setting (`default_web_ui_role`).
3. For a specific project that needs different values, the orchestrator opens that project's
   Settings (the second level of the Projects overlay) and sets a project-level override for just
   the key that needs to differ — every other key keeps inheriting the system default.

## Other Scenarios

- **Editing a plain dictionary** (`task_statuses`, `task_types`, `story_statuses`,
  `participant_roles`): an editable list of values — add one, remove one.
- **Editing `link_types`**: each entry carries three parts — a machine value, an outbound display
  label (shown when the viewed item is the source of a link), and an inbound display label (shown
  when it's the target). A symmetric entry (outbound label = inbound label, e.g. "context") is valid.
- **Editing `default_web_ui_role`**: a single choice picked from the current `participant_roles`
  values, never a list. Its only observable effect today is pre-filling the Web UI's Add Comment
  author-role field.
- **Clearing a project override** (AI agents only — see Known Limitations): restores the system
  default for that one key, leaving every other key's override untouched.

## Who Can Access It

Web UI (the human orchestrator) and AI agents (via MCP) — both with full read/write access to both
system-level defaults and project-level overrides.

## Business Rules

- A project-level override for a key completely replaces the system default for that key — the two
  are never merged.
- `link_types` is the only dictionary with a structured (value/outbound/inbound) entry; the other
  four are plain lists of values.
- Every entry in a dictionary must be non-empty; a `link_types` entry additionally requires all three
  parts (value, outbound label, inbound label) non-empty, and its machine value must be unique
  within the list.
- Changing a `link_types` entry's display labels does not retroactively relabel links that already
  exist with the old value — only the machine value is stored on a link; labels are resolved live
  whenever the link is displayed.
- `default_web_ui_role` must always be a current member of `participant_roles` for its own scope
  (system or project); once stored, it is never re-checked against later dictionary changes, so an
  inherited value can legitimately fall outside a project's later-overridden roles — harmless, since
  a comment's own author role is always free text regardless of this setting.

## Known Limitations

- Clearing a project-level override is only reliably possible via the AI-agent (MCP) surface today —
  the Web UI's "Clear override" control (present on every settings row, including
  `default_web_ui_role`) does not work end-to-end and fails when clicked.
