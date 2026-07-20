---
id: tc-003
tags: @smoke @regression
story: STORY-008
status: Active
---

# tc-003: Milestone Detail — Comments section renders correctly, placeholder note gone

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one milestone
- Browser viewport set to 1280px wide

## Steps
1. Navigate to a project's Milestones tab and open a milestone's Milestone Detail page
2. Scroll down past the assigned stories list and the Attachments section to where Comments should appear

## Expected Result
- The previous "Deferred to STORY-008" placeholder note is no longer present anywhere on the page
- A "Comments" heading is visible directly below the Attachments section, with a live count badge
- When no comments exist, an empty state is shown (placeholder text — no error, no spinner)
- When comments exist, the thread renders oldest-first with author role, Markdown content, label chips, and a timestamp per entry
- Each comment exposes inline Edit, Reply, Delete, and Copy link icon actions
- An "Add Comment" form is pinned at the bottom of the section
- No "Something went wrong" overlay or console error while the section loads
