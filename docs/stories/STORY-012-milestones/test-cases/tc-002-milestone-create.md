---
id: tc-002
tags: @smoke @regression
story: STORY-012
status: Active
---

# tc-002: Create a milestone — required fields, optional description

## Preconditions
- App is running at http://localhost:3000.
- At least one project exists.
- The Milestones tab for the selected project is open.

## Steps
1. Open the Milestones tab for a project.
2. Click the "Create milestone" button (or equivalent action).
3. Verify a form or modal opens with fields: name (required), description (optional).
4. Submit the form without filling in the name field.
5. Verify a validation error is shown for the name field; the form is not submitted.
6. Fill in the name field with a unique name (e.g. "Sprint 1").
7. Leave the description empty.
8. Submit the form.
9. Verify the new milestone appears in the milestones list with name "Sprint 1" and status badge "Planned".
10. Click "Create milestone" again.
11. Fill in name "Sprint 2" and a description "Second sprint".
12. Submit the form.
13. Verify "Sprint 2" appears in the list with the description visible (or truncated if long).

## Expected Result
- The name field is required; submitting without it shows a validation error.
- A milestone created without a description is accepted and shown in the list.
- A milestone created with a description shows it in the list (possibly truncated).
- Newly created milestones have status "Planned" by default.
- The list updates to include the new milestone without a full page reload.
