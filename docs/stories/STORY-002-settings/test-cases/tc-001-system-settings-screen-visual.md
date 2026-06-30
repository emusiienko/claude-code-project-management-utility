---
id: tc-001
tags: @smoke @regression
story: STORY-002
status: Active
---

# tc-001: System Settings screen — visual pass

## Preconditions

- App running at `http://localhost:3000`
- System defaults seeded (migration 0003 applied); at least one value visible per dictionary key

## Steps

For each resolution column (375px · 767px · 768px · 1280px):

1. Set viewport to the target width
2. Navigate to `/settings`
3. Verify the universal visual checklist below

### Universal visual checklist (all resolutions)

- [ ] Page loads without exception screen or "Something went wrong" overlay
- [ ] No horizontal scrollbar appears
- [ ] No content overlap or clipping (text, cards, tag chips)
- [ ] Grid and spacing are consistent — six dictionary sections visible and evenly laid out
- [ ] Each section header label displays a human-readable name ("Task Statuses", "Task Types", "Story Statuses", "Attachment Types", "Link Types", "Participant Roles")
- [ ] All six dictionary value lists are visible and not empty
- [ ] Text stays within container boundaries — no truncated or overflowed value labels
- [ ] Inline edit controls (input field, save/cancel buttons) are accessible — not pushed off-screen; touch targets >= 44px height on mobile
- [ ] Element states render correctly: focus ring on input, hover state on edit/save button, disabled state when field is unchanged
- [ ] Long value strings (e.g. a dictionary value with 40+ characters) do not break section layout

### Screen-specific checks (all resolutions)

- [ ] Page title or heading identifies this as system-level settings (not project-specific)
- [ ] Each of the six dictionary sections shows the current list of values as readable tags or rows
- [ ] An "Edit" affordance (button, pencil icon, or inline control) is present per section
- [ ] Entering edit mode for one section does not collapse or hide other sections

## Expected Result

At all four resolutions: the System Settings screen renders completely, all six dictionary sections are visible with human-readable labels, edit controls are reachable and visually correct.
