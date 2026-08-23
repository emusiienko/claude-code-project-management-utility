# Project Management

## Happy Path

1. The orchestrator opens the global **Projects** overlay (reachable from anywhere via a top-bar
   entry) and sees a list of every existing project.
2. They click **Create project**, fill in a name and an optional description, and submit.
3. The new project appears in the list immediately and is ready to use — every other module
   (Stories, Sessions, Settings, Milestones) can now anchor work to it, with no further setup
   required.

## Other Scenarios

- **Rename / edit description**: editing a project's name or description through the same list.
- **Delete a project**: a confirmation names everything that will be permanently removed along with
  it (its Stories, Tasks, Attachments, Comments, TaskLinks, Milestones, Sessions, and Settings
  overrides) before the action is taken.
- **Open a project's Settings**: clicking a project's name in the Projects overlay opens that
  project's Settings editor as a second overlay level, without navigating away from wherever the
  orchestrator currently is; a dedicated action jumps from there straight into the project's Stories.

## Who Can Access It

Web UI (the human orchestrator) and AI agents (via MCP) — both with full read/write access. No
authentication or role restriction exists anywhere in the product, by design.

## Business Rules

- A project's name must be unique across the whole product (case-insensitive) — creating or renaming
  into a name already in use is rejected.
- A whitespace-only name is rejected — a name must contain real content.
- Deleting a project is permanent and cascades to everything that belongs to it; nothing nested
  survives independently.

## Known Limitations

- A project's description, once set, can only be replaced with new text — there is no dedicated
  action to clear it back to empty.
