---
status: Done
assignee: frontend-developer
story: STORY-004
---

# TASK-004: Reusable Labels editor

## What to implement
Build a shared, controlled key-value pair editor for labels, placed in the shared component layer
(not inside the stories feature) so tasks and comments can reuse it later.

Behavior:
- Controlled component: takes the current list of key/value pairs as a value and reports changes via
  an onChange callback. No data fetching, no business logic, no knowledge of any specific domain.
- Add a new empty pair via a text-style button; remove a pair via a per-row icon button that reuses
  the existing shared icon-button primitive (follows the established icon/text-button split).
- Each row edits a key and a value; the key is the required field.
- Renders distinct, queryable UI for the empty state (no pairs yet).

A shared component must never be imported feature-to-feature — this belongs in the shared layer
precisely so multiple features can consume it directly.

## Scope
`frontend/src/shared/components/` (new Labels editor), reusing the existing shared icon-button
primitive.

## Dependencies
None (frontend-only; can start in parallel with backend work).

## Acceptance Criteria
- [ ] Component lives in the shared layer, not in the stories feature.
- [ ] It is fully controlled: value in, onChange out; no fetching or business logic.
- [ ] Add uses a text button; per-row remove uses the shared icon-button primitive.
- [ ] Each row edits a key/value pair; key is required.
- [ ] Empty state renders distinct, queryable UI.

## Intended ADR
None.

---
## Implementation Report

**Date**: 2026-07-07

**What was done**: Created `frontend/src/shared/components/LabelsEditor.tsx` — a fully controlled key-value pair editor for labels. The component renders: (1) an empty state (`data-testid="labels-editor-empty"`) when no pairs exist, (2) a list of existing labels each with a destructive `IconButton` for removal, and (3) an "Add label" row with separate key/value text inputs and an "Add label" text button. Key is required — the Add button is disabled until the key input is non-empty. Pressing Enter in either input triggers add. Re-exports the `Label` type from `@/api/types` so consumers have a single import location.

**Deviations from plan**: None. The `aria-label` format on the remove button matches the spec exactly: `"Remove {key}:{value}"` when a value is present, `"Remove {key}"` when value is empty (omitting the colon avoids a misleading label like "Remove mykey:").

**Technical decisions made**:
- Draft key/value live in local `useState` inside the component (the only local state needed; the committed labels array is fully controlled via props).
- The `data-testid="labels-editor-empty"` attribute on the empty-state paragraph makes the empty state queryable for QA without relying on text content.
- `re-export type { Label }` from this file keeps the public API clean — consumers import both the component and the type from one location.
- Key input uses `aria-required="true"` to signal that key is mandatory without relying on native browser validation (the component is not a `<form>`).

**Code locations**:
- `frontend/src/shared/components/LabelsEditor.tsx` — new file (the full implementation)

**Technical debt noted**: None.
