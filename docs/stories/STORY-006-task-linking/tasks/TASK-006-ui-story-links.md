---
status: Done
assignee: frontend-developer
story: STORY-006
---

# TASK-006: Story links UI in Story slide-over

## What to implement

Replace the Links placeholder section in the Story slide-over right panel (StoryRightPanel) with a live
Links section backed by the story-link hooks from TASK-004.

**Link list.** Show all outbound and inbound links for the story. Each row displays a direction
indicator (→ for outbound, ← for inbound), the `link_type` as a badge, and the linked story's
title. The linked story's title is a clickable link that navigates to that story's slide-over
(URL updates to `/projects/:projectId/stories/:linkedStoryId`).

**Add-link form.** A control to create a new link: a target story selector (stories within the
same project, excluding the current story) and a `link_type` dropdown. The `link_type` options
come from the project's effective `link_types` dictionary, already in cache from
`useProjectSettingsEffective` — no extra network call. On submit, create the link and refresh
the list.

**Delete.** A per-row delete button opens a confirmation dialog; on confirm, remove the link
and refresh the list.

Surface field/validation and conflict errors (self-link, duplicate, invalid `link_type`) inline.

## Scope

`frontend/src/features/story-links/components/` — the Links section and its subcomponents
(link row, add-link form, delete confirmation). The StoryRightPanel is modified to render the
new section in place of the existing Links placeholder.

## Dependencies

TASK-004.

## Acceptance Criteria

- [ ] The Links section in the Story slide-over lists all outbound and inbound links, each with a direction indicator (→ / ←), a `link_type` badge, and the linked story's title.
- [ ] Clicking a linked story's title navigates to that story's slide-over (URL updates to `/projects/:projectId/stories/:linkedStoryId`).
- [ ] The Add-link form offers a target story selector (stories in the same project, current story excluded) and a `link_type` dropdown populated from the effective `link_types` with no extra network call; submitting creates the link and refreshes the list.
- [ ] A per-row delete button opens a confirmation dialog and removes the link on confirm, refreshing the list.
- [ ] Backend rejections (self-link, cross-project, invalid type, duplicate) are shown inline.

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-12

**What was done**:
- Created `src/features/story-links/components/DeleteStoryLinkDialog.tsx` — alertdialog confirmation before removing a story link; shows the link_type and linked story title.
- Created `src/features/story-links/components/AddStoryLinkForm.tsx` — inline form with a target story `<select>` (populated from project story list, current story excluded) and a link_type `<select>` (from the `linkTypeOptions` prop already in cache — no extra fetch). Disables submit while loading or submitting.
- Created `src/features/story-links/components/StoryLinksSection.tsx` — full live Links section; renders an enriched link list (direction indicator → / ←, link_type badge, clickable story title that navigates to the linked story's slide-over), togglable add-link form, per-row delete with confirmation. Uses `useStoryLinkList`, `useCreateStoryLink`, `useDeleteStoryLink` from TASK-004.
- Modified `src/features/stories/components/StoryRightPanel.tsx` — added `linkTypeOptions?: string[]` prop; replaced the "Links coming soon (STORY-006)" placeholder with the live `StoryLinksSection`, passing `story.id`, `story.project_id`, and `linkTypeOptions`.
- Modified `src/features/stories/components/StorySlideOver.tsx` — extracted `link_types` from `effectiveSettings` (already in cache) as `linkTypeOptions` and passed it to `StoryRightPanel`.
- Modified `src/features/stories/components/StorySlideOver.test.tsx` — added mocks for `useStoryLinkList`, `useCreateStoryLink`, `useDeleteStoryLink` (the new hooks rendered by `StoryLinksSection`) and configured them in `beforeEach` to return empty data; added `link_types: []` to the `useProjectSettingsEffective` mock return. No test logic changed — only mock scope widened to cover new dependencies.

**Deviations from plan**: None.

**Technical decisions made**:
- Story title navigation (`handleNavigateToLinkedStory`) uses `useNavigate` + `navigate()` rather than an `<a>` tag or `<Link>` to stay consistent with how `StorySlideOver` closes itself (also uses `navigate`). The URL update is explicit and matches the requirement.
- `StoryLinksSection` uses the `useStoryLinkList` hook directly (not the `StoryDetail.links` field from `useStoryDetail`) because the slide-over only fetches the summary-level `useStory` (not the detail endpoint), and the separate link-list query gives fresh data on mutation invalidation independently of the detail route.
- `AddStoryLinkForm` fetches the project story list with `useStories` (page-size 50 — the global PAGINATION.STORIES default). For projects with more than 50 stories the selector would be incomplete. This is acceptable for the current single-developer utility but noted as debt.
- `DeleteStoryLinkDialog` renders above the slide-over at `z-[80/90]`, matching the z-index conventions in use for the `TaskDetailModal` and its backdrop.

**Code locations**:
- `frontend/src/features/story-links/components/DeleteStoryLinkDialog.tsx`
- `frontend/src/features/story-links/components/AddStoryLinkForm.tsx`
- `frontend/src/features/story-links/components/StoryLinksSection.tsx`
- `frontend/src/features/stories/components/StoryRightPanel.tsx` (modified — added Links section)
- `frontend/src/features/stories/components/StorySlideOver.tsx` (modified — passes linkTypeOptions)
- `frontend/src/features/stories/components/StorySlideOver.test.tsx` (modified — added mocks for new hooks)

**Technical debt noted**:
- `AddStoryLinkForm` uses `PAGINATION.STORIES` (50) for the target story selector. Projects with > 50 stories will have an incomplete list. A future task should either paginate/search or increase the limit to the API maximum.
