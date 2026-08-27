---
id: TC-153
tags: @smoke @regression
story: STORY-008
status: Active
---

# TC-153: Comment permalink navigation — deep link scrolls and highlights the comment

## Preconditions
- A story, a task, and a milestone each have at least one comment
- The Comments section on each host is long enough (or the viewport short enough) that the target comment is not already in view on load

## Steps

### Part A — standalone permalink, per host
1. Copy a comment's link (or note its `/comments/:id` URL) on the story's Comments section
2. Open that URL directly in the browser (e.g. paste into the address bar and navigate)
3. Repeat for a comment on a task and a comment on a milestone

### Part B — reply-prefix jump link
1. On any host, click a reply's "↩ Replying to {author_role}" prefix line

## Expected Result
- Part A: opening the URL for each host type navigates directly to that comment's owning view (Story slide-over, Task Detail modal, or Milestone Detail page, respectively) with the Comments section already expanded, and that specific comment scrolled into view with a brief highlight (e.g. a momentary accent background that fades)
- Part B: clicking the reply-prefix line resolves through the same mechanism — it navigates to (or scrolls within) the same host view, highlighting the parent comment
- No error screen or console error appears during any of these navigations
