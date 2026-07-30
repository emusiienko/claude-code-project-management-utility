---
id: BUG-005
story: STORY-009
severity: minor
status: fixed
assignee: frontend-developer
---

# BUG-005: Sessions combobox dropdown arrows sit too close to the control's border, inconsistent with Task Manager's select styling

## Description
Reported directly by the user with screenshots. Every native `<select>`/combobox control in the
Sessions feature renders its dropdown chevron icon with too little padding between the icon and
the control's right border — visually inconsistent with the select styling already established
(and previously fixed) elsewhere in the app for Task Manager (e.g. story/task/milestone selects,
`BoardMilestoneFilter`). The user recalls this exact spacing issue was already fixed once for Task
Manager selects, so Sessions' selects should reuse whatever consistent styling/class was applied
there rather than a one-off.

Affected controls (per the two screenshots provided):
- Session Detail edit view: the status `<select>` next to "Cancel edit"/"Archive", the Participant
  role select, the Linked story select, and the Linked task (story-picker step) select.
- Sessions List view: the "Linked story" filter select in the filter bar.

The Create Session form's selects (Participant role, Story/Task link pickers) were not shown in
the screenshots but likely share the same underlying control/styling and should be checked too.

## Steps to Reproduce
1. Open a Session's Detail view in edit mode.
2. Observe the status select (top toolbar), Participant role select, Linked story select, and
   Linked task select — the dropdown chevron in each sits almost flush against the control's right
   border.
3. Open the Sessions List view and observe the "Linked story" filter select's chevron — same issue.

## Expected Result
All Sessions comboboxes have the same chevron spacing/padding as the already-fixed Task Manager
selects, so the control looks consistent across the app.

## Actual Result
Sessions selects render the chevron icon too close to the border, looking visually distinct from
(and less polished than) Task Manager's selects.

## Additional Info
Screenshots provided by the user:
- Session Detail edit view (status/participant role/linked story/linked task selects annotated)
- Sessions List filter bar (linked story filter select annotated)

## Fix Notes
Root cause: every Sessions `<select>` relied on the browser's native `<select>` appearance (only
symmetric `px-*` padding, no `appearance-none`), so the browser's own arrow glyph rendered flush
against the control's border with no reliable, cross-browser-consistent spacing. The one place in
the app where this was actually already solved — the `TopBar` app-switcher and `StoriesPage`
status filter (`frontend/src/app/TopBar.tsx`, `frontend/src/features/stories/StoriesPage.tsx`) —
disables the native appearance (`appearance-none`) and renders its own absolutely-positioned
`ChevronDown` (`right-2.5`) over a `pr-8` reserved area on the `<select>`, giving full, consistent
control over the icon's spacing. That pattern existed twice, inline, with no shared implementation
— so there was no single mechanism to converge Sessions onto.

Fix: extracted that pattern into a new shared primitive, `frontend/src/shared/components/
SelectField.tsx` (wraps a native `<select>` with `appearance-none pr-8` + the same `ChevronDown`
overlay; forwards all native select props/children and a `className` for the select's own
color/border/sizing, plus an optional `wrapperClassName` for the positioning container's
width/display). Every Sessions `<select>` now renders through `SelectField` instead of a bare
`<select>`:
- `SessionStatusControl.tsx` (Session Detail status select)
- `SessionForm.tsx` / `SessionEditForm.tsx` (Participant role select — both Create and Edit forms)
- `StoryLinkField.tsx` (Linked story select — shared by Create and Edit forms)
- `TaskLinkField.tsx` (both steps of the Linked task picker — task's story, then the task)
- `SessionListPage.tsx` (Linked story filter select in the list's filter bar)

`TopBar.tsx`/`StoriesPage.tsx` were left as-is (out of this bug's scope, already correct) — a
future cleanup could migrate them onto `SelectField` too so the whole app shares one
implementation, since they currently duplicate the pattern `SelectField` now centralizes.

Verified: full `vitest` suite (252 tests) and `tsc --noEmit` both pass with no regressions.
