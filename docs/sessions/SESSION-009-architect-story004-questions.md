---
session: SESSION-009
agent: architect
status: completed
---

## Briefing
**Goal**: Answer the user's questions about the STORY-004 implementation plan before implementation begins.

**Context**: STORY-004 (Story Management) has just been designed. The architect wrote:
- `docs/stories/STORY-004-story-management/implementation_plan.md`
- `docs/stories/STORY-004-story-management/tasks/` (7 task files, index.md)

The user has read the implementation plan and has questions for the architect. The implementation has NOT started yet — this session may result in plan revisions before any code is written.

Key decisions already confirmed by the user:
- Click on story title in the list → opens edit modal (not a separate detail route)
- `milestone_id` stored as a nullable column without FK (FK added when STORY-012 creates the milestone table)
- API contract is LOCKED — no changes

**Topics**: The user's questions about the implementation plan (open-ended — let the user lead).

---

## Report

**Decisions made**:
- **No plan revision.** STORY-004 proceeds exactly as designed. The `labels` model stays as free-form `{key, value}` pairs; the `status` field stays as the single dictionary-bound (`story_statuses`) combobox.
- Confirmed the current two-mechanism design is the intended one: structured/constrained attribute = `status` (via the six fixed settings dictionaries); unstructured metadata = `labels` (free-form, no settings link).

**Open questions**: None. The user considered a broader "user-defined custom attributes" model (admin defines arbitrary attribute dictionaries in Settings, each surfacing as a constrained combobox field on the story) but, after clarification, accepted the current design and did not pursue it.

**Summary**: The session was a Q&A to align the user's mental model with the STORY-004 plan before implementation. Key clarifications delivered:
1. `DictionaryEditor` edits a flat `string[]` for one of six fixed dictionary keys — it is NOT reused for story labels (labels are `{key,value}` pairs → new shared `LabelsEditor`, TASK-004).
2. The settings dictionaries are a **fixed frozenset of six** (`story_statuses`, `task_statuses`, `task_types`, `participant_roles`, `link_types`, `attachment_types`); `validate_dict_key()` rejects any other key. They are NOT user-extensible — the user's assumption ("6, could be 10, depending on what I define") was corrected.
3. On a story, only **one** dictionary is reflected: `story_statuses` → the `status` combobox. The other five belong to later domains (tasks, task_links, attachments).
4. `labels` are fully independent of Settings/defaults; purpose per requirements = arbitrary metadata + a filtering/scoping channel so the orchestrator agent can narrow its startup read (`?label_key&label_value`). Requirements explicitly note "status is NOT stored here."

The "custom attributes / extensible dictionaries" idea was explicitly identified as out of scope for STORY-004 — it would require a Settings-domain extension, a LOCKED-contract revision, and a re-spec, i.e. its own future story. No documents were changed; the implementation plan and task files stand as written.
