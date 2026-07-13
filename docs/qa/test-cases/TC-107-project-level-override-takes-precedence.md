---
id: TC-107
tags: @regression
story: STORY-020
status: Active
---

# TC-107: Project-level link_types override is used for that project's links — not the system default

## Preconditions

- App is running at http://localhost:3000
- At least one project exists (use Project A)
- The system default `link_types` has the four canonical entries
- Viewport: 1280px

## Steps

1. Navigate to `/projects/:id/settings` for Project A
2. In the `link_types` section, add a project-level override entry: Value `depends-on`, Outbound `PROJECT DEPENDS ON`, Inbound `PROJECT DEPENDENT`
3. Save the project settings
4. Navigate to the story slide-over or Task Detail modal for a story/task in Project A that has a `depends-on` link
5. Observe the link badge label for the outbound direction
6. Navigate to another project (Project B) that has a `depends-on` link but no project-level override
7. Observe the link badge label for the same link type

## Expected Result

- In Project A: the link badge shows "PROJECT DEPENDS ON" (project-level override)
- In Project B: the link badge shows "depends on" (system default, unchanged)
- The override affects only Project A; system-level entries are not mutated

## Cleanup

- Remove the project-level `link_types` override from Project A settings
