---
id: TC-136
tags: @smoke @regression
story: STORY-021
status: Active
---

# TC-136: Attachment rows display Title instead of Type across Story, Task, and Milestone Attachments sections

## Preconditions
- App is running at http://localhost:3000
- At least one attachment already exists on a story (created either before or after this change), or is created as part of this test
- A Task with attachments and a Milestone with attachments are also available (or attachments are added to each during the test)

## Steps
1. Open a story's slide-over Attachments section; create a new attachment with a distinct Title (e.g. "Design mockup v2")
2. Observe the attachment row for the new entry, and for any pre-existing attachment rows
3. Open a Task Detail Modal with an attachment (create one if none exists) and repeat the observation
4. Open a Milestone Detail view with an attachment (create one if none exists) and repeat the observation

## Expected Result
- Every attachment row (Story, Task, and Milestone Attachments sections) shows the attachment's Title as its primary label
- No row anywhere displays a "Type" value or Type badge — that field/column no longer appears in any listing
- The "kind" badge (document/image/file/external-ref) is still shown alongside the title, unaffected
- External-ref rows still show their URL as secondary text alongside the Title
- Pre-existing attachments created before this change also show a non-empty Title (backfilled) — no row shows a blank title
