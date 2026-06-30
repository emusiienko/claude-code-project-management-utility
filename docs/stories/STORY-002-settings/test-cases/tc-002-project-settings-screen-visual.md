---
id: tc-002
tags: @smoke @regression
story: STORY-002
status: Active
---

# tc-002: Project Settings screen — visual pass

## Preconditions

- App running at `http://localhost:3000`
- At least one project exists (created via Projects screen or API)
- Navigate using a valid `:projectId` for that project

## Steps

For each resolution column (375px · 767px · 768px · 1280px):

1. Set viewport to the target width
2. Navigate to `/projects/:projectId/settings`
3. Verify the universal visual checklist below
4. At 1280px only: switch to dark mode and re-verify the dark mode row

### Universal visual checklist (all resolutions)

- [ ] Page loads without exception screen or "Something went wrong" overlay
- [ ] No horizontal scrollbar appears
- [ ] No content overlap or clipping (text, cards, tag chips)
- [ ] Grid and spacing are consistent — six dictionary sections visible and evenly laid out
- [ ] Each section header label matches the dictionary key name (`task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`, `participant_roles`)
- [ ] All six dictionary sections are visible; sections without a project override show the current system default values
- [ ] Text stays within container boundaries — no truncated or overflowed value labels
- [ ] Override controls (input field, save/cancel buttons) are accessible — not pushed off-screen; touch targets >= 44px height on mobile
- [ ] Element states render correctly: focus ring on input, hover state on save button, hover/focus on clear-override control
- [ ] Long value strings do not break section layout
- [ ] Dark mode: no element retains a light background or light text that clashes with the dark theme

### Screen-specific checks (all resolutions)

- [ ] Page title or heading identifies this as project-specific settings (project name or "Project Settings" label visible)
- [ ] Each section that has NO override shows a visual indicator that the system default is in use (e.g. label "Using system default", greyed-out appearance, or badge)
- [ ] Each section that HAS an override shows a visual indicator that a project override is active
- [ ] A "Clear override" affordance is visible on sections that have an override
- [ ] Sections using the system default do NOT show a "Clear override" affordance (no action available when there is nothing to clear)

## Expected Result

At all four resolutions: the Project Settings screen renders completely, all six dictionary sections are visible. Sections clearly distinguish between "system default" and "project override" states. Override controls are accessible. Dark mode pass at 1280px shows no light-on-dark color clashes.
