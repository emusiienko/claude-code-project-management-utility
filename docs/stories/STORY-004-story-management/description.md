---
status: Accepted
type: feature
priority: P0
date: 2026-06-28
---

# STORY-004: Story Management

## Desired Outcome
Work can be organised into stories — named containers within a project that represent high-level deliverables or features. Each story has a status drawn from the project's configured values and optional free-form labels.

## Context
Stories are the primary unit of work visible to the human orchestrator. The status field is validated against the project's effective `story_statuses` dictionary at write time. Stories can be filtered by status and label content, enabling the orchestrator agent to scope its startup read to only the stories it cares about.

## UI Description

### Entry point
Stories are a sub-view of a Project. From the Projects list (`/projects`), clicking a project name navigates to `/projects/:id` — the Stories View. This is the first screen shown when opening a project; no additional navigation step is required.

### Stories list view
The page heading shows the project name. Below it, a table lists all stories in the project. Each row displays:
- **Title** — clickable; navigates to the Story Detail View (`/projects/:id/stories/:storyId`)
- **Status** — rendered as a badge
- **Labels** — rendered as tag chips
- **Task aggregate** — "N/M done" (fetched from `GET /stories/:id/aggregate`); shown as "N/A" when the story has no tasks (implemented in STORY-005)

Row-level action buttons use Lucide React icons (same pattern as the Projects screen):
- **Edit** icon — opens the story form pre-filled in a modal
- **Delete** icon — opens a confirmation dialog; uses a visually distinct (red/danger) icon colour

### Filter bar
Above the stories table, a filter bar allows narrowing the list:
- **Status** — dropdown populated from the project's effective `story_statuses` dictionary
- **Label key** — free-text input
- **Label value** — free-text input
Filters can be applied independently or in combination. Clearing all filters restores the full paginated list.

### Create story
A "New story" button above the table opens a modal. The form contains:
- **Title** (text input, required, 1–500 chars)
- **Content** (Markdown textarea, optional)
- **Status** (dropdown populated from the project's effective `story_statuses`, optional)
- **Labels** (key-value pair editor — same Labels Editor component used throughout the app)

Submitting the form creates the story and closes the modal. Validation errors (missing title, invalid status value) are shown inline below the relevant field.

### Edit story
Clicking the Edit icon on a row opens the same modal pre-filled with the story's current values. Submitting updates the story in place; the row refreshes without a full page reload.

### Delete story
Clicking the Delete icon on a row opens a confirmation dialog naming the story title. Confirming permanently deletes the story. At this stage the dialog does not enumerate nested entities (tasks, attachments, comments) because those domains are introduced in later stories.

### Empty state
When a project has no stories, the table is replaced by a friendly empty-state message with a "New story" call-to-action button.

## Acceptance Criteria
- [ ] A story can be created within a project with a required title (1–500 chars), optional Markdown content, optional status (validated against the project's effective `story_statuses`), and optional free-form labels (key-value pairs)
- [ ] Stories within a project can be listed with pagination and filtered by status, label key, and label value independently or in combination
- [ ] A story's title, content, status, and labels can be updated; updating labels replaces the entire labels array
- [ ] A story can be deleted permanently
- [ ] A single story can be retrieved by its ID, including all its fields

## Edge Cases & Error Scenarios
- [ ] Setting a story status to a value not in the project's effective `story_statuses` is rejected: "Status value '{v}' is not allowed. Allowed: {list}."
- [ ] Setting story status to null (removing it) is valid for a story that previously had a status
- [ ] Updating labels with an empty array removes all labels from the story — this is valid
- [ ] Filtering stories by a label key that no story has returns an empty list, not an error
