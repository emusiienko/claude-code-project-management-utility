---
id: tc-016
tags: @regression
story: STORY-012
status: Active
---

# tc-016: Edge case — deleting a project removes all its milestones; affected stories lose milestone link

## Preconditions
- App is running at http://localhost:3000.
- Project A exists with two milestones: "Sprint 1" (Active) and "Sprint 2" (Planned).
- At least one story in Project A is assigned to "Sprint 1".
- Project B exists (used to verify isolation — should be unaffected).

## Steps
1. Navigate to the Projects list (/projects).
2. Delete Project A via its delete action and confirm the deletion.
3. Verify Project A no longer appears in the projects list.
4. Verify Project B still appears in the projects list and is unaffected.
5. (Secondary verification) Navigate to any route that lists all milestones or stories — confirm no orphaned records from Project A are visible.

## Expected Result
- Deleting a project removes all its milestones from the system.
- No milestones from the deleted project appear in any view.
- Other projects and their milestones are unaffected.
- Stories that belonged to the deleted project are removed along with the project (cascade behavior); no orphaned milestone links remain.
