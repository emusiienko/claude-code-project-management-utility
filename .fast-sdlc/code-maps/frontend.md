# Frontend Code Map

Module/function-level account of where things live in `frontend/src/`, owned by coder (frontend),
kept current at Reconcile. More granular than the folder-level Repository Structure in root
`CLAUDE.md`. Organized by the repo's existing top-level source folders. Paths below are relative to
`frontend/src/` unless stated otherwise.

---

## api/ — HTTP layer (types, path constants, endpoint functions)

Nothing above this layer calls `fetch` directly; `core/client.ts` is the only thing api/ itself
depends on. Feature hooks (`features/*/hooks/`) are the only consumers of `api/endpoints/*`.

- `api/types.ts`: Canonical TypeScript types derived from the API Contract (LOCKED, v1.10) — one entity/domain type plus a `Create*`/`Update*` pair each; never redeclare a shape inline.
- `api/paths.ts`: Centralized `API_PATHS` constant (one section per domain, parameterized paths as factory functions) — all URL strings live here, never inline.
- `api/endpoints/projects.ts`: Projects endpoint functions (`getProjects`, `createProject`, `getProject`, `updateProject`, `deleteProject`).
- `api/endpoints/stories.ts`: Stories endpoint functions (`listStories`, `createStory`, `getStory`, `updateStory`, `deleteStory`); the story aggregate endpoint lives in `tasks.ts` instead as a Tasks-domain operation.
- `api/endpoints/tasks.ts`: Tasks endpoint functions plus `getStoryAggregate`.
- `api/endpoints/milestones.ts`: Milestones endpoint functions, including `activateMilestone`/`finishMilestone` and `listMilestoneStories`.
- `api/endpoints/sessions.ts`: Sessions endpoint functions per STORY-009's contract, superseding the stale v1.0 forward-spec; includes `deleteSession` (STORY-008, `DELETE /v1/sessions/:id`, unrestricted by `archived_at`/`status` — the archived-only restriction is Web-UI-only, applied by its callers).
- `api/endpoints/comments.ts`: Comment endpoint functions, including `getCommentAncestors`.
- `api/endpoints/attachments.ts`: Attachment endpoint functions — create/list/get/delete only (attachments are immutable, no update/archive); base64 MCP create/read tools have no REST equivalent.
- `api/endpoints/storyLinks.ts`: Story links endpoint functions.
- `api/endpoints/taskLinks.ts`: Task links endpoint functions.
- `api/endpoints/settings.ts`: System/project settings endpoint functions, including effective-settings and override get/set/clear.

---

## app/ — route table, layout shells, top-level navigation surfaces

- `app/App.tsx`: Application root composing `QueryClientProvider` → `RouterProvider`, no business logic.
- `app/router.tsx`: Route table across three nesting levels of layout shells (RootLayout → SessionsShell/AppShell → ProjectShell → leaf pages), all pages lazy-loaded via `React.lazy`/`Suspense`.
- `app/queryClient.ts`: Singleton TanStack Query client with default stale time 0.
- `app/RootLayout.tsx`: Flat root layout (`TopBar` + `<Outlet/>` + always-mounted `OverlayHost`) that owns the single `useOverlayStack` instance.
- `app/RootRedirect.tsx`: Handles `/` — redirects to the last-visited or first project, or opens the Projects overlay when none exist.
- `app/Layout.tsx`: Legacy top-level chrome (top nav bar + `<Outlet/>`), domain-agnostic and distinct from `RootLayout`.
- `app/TopBar.tsx`: Top bar with app-switcher combobox and Projects/Config overlay triggers (overlay triggers, not routed `NavLink`s, since STORY-022 Rev 3).
- `app/OverlayHost.tsx`: State-driven slide-over overlay host for Projects and Config, reusing the Story slide-over's panel chrome.
- `app/AppShell.tsx`: Task Manager mode shell hosting `ProjectSidebar` + `<Outlet/>`, owning its own `useResizablePanel` instance (STORY-006 TASK-010).
- `app/ProjectSidebar.tsx`: Collapsible, resizable left sidebar for Task Manager mode, prop-driven only.
- `app/ProjectShell.tsx`: Per-project sub-nav shell with Stories/Board/Milestones tabs and a nested `<Outlet/>`.
- `app/SessionsShell.tsx`: Sessions mode shell mirroring `AppShell`, with its own distinct `useResizablePanel` instance (STORY-006 TASK-010).
- `app/SessionsSidebar.tsx`: Collapsible, resizable left sidebar for Sessions mode, structurally mirroring `ProjectSidebar` with its own localStorage keys.
- `app/SessionsIndexRedirect.tsx`: Handles `/sessions` index, mirroring `RootRedirect`'s decision tree scoped to Sessions mode.
- `app/SessionsProjectGate.tsx`: Validates `:projectId` for Sessions mode, mirroring `ProjectShell`'s validation.

---

## config/ — cross-cutting constants

- `config/apiConfig.ts`: Pagination limits and TanStack Query stale times — reference these instead of hardcoding numbers inline.
- `config/cacheConfig.ts`: `CACHE_KEYS` registry for all TanStack Query cache keys, allowing invalidation at any granularity.

---

## core/ — HTTP client

- `core/client.ts`: Typed HTTP client wrapping native `fetch` — every API call must go through this, never call `fetch` directly from components/screens/hooks.

---

## features/attachments/ — Attachments section (STORY-007)

- `AttachmentsPage.tsx`: `/attachments` route entry, a placeholder — the full feature lives in `AttachmentsSection` instead.
- `components/AttachmentsSection.tsx`: Reusable Attachments section mounted in the Story slide-over / Task Detail modal / Milestone Detail (create + delete only, no edit).
- `components/AttachmentRow.tsx`: One attachment row, with actions varying by kind (external-ref → Open link + Delete; stored-file → View/Download + Delete).
- `components/UploadAttachmentPanel.tsx`: "Add attachment" form covering all four kinds, with a client-side 10 MB guard and an upload progress indicator above 1 MB.
- `components/AttachmentViewerModal.tsx`: In-app viewer for renderable stored-file kinds by `mime_type`, focus-trapped with Escape support.
- `components/DeleteAttachmentDialog.tsx`: Delete confirmation dialog, shared across every attachment kind.
- `hooks/useAttachments.ts`: TanStack Query hooks for Attachments, whose mutations invalidate both the container's list and the parent's rich-detail cache.
- `utils/attachmentTitle.ts`: Title length constraint and truncation, mirroring the backend's `TITLE_MAX_LENGTH`.
- `utils/mimeAllowList.ts`: Per-kind MIME allow-lists and upload limits mirroring the backend, used as a UX guard only.
- `utils/viewerSupport.ts`: Decides how the in-app viewer renders a stored-file attachment, branching purely on `mime_type`.
- `utils/formatFileSize.ts`: Byte count to human-readable size formatter.
- `utils/errorMessages.ts`: Error message extraction, a per-feature copy of the shared error-message pattern.

---

## features/board/ — Story kanban board

- `BoardPage.tsx`: Kanban board at `/projects/:projectId/board`, one column per effective `story_statuses` value, with milestone filter (STORY-017) and optimistic drag-and-drop.
- `components/BoardColumn.tsx`: One status column, droppable under id `"col-<status>"`.
- `components/BoardCard.tsx`: Draggable story card injecting current status into `useSortable`'s data for same-column-drop detection.
- `components/BoardMilestoneFilter.tsx`: Milestone combobox in the Board header, where "All stories" maps to a null selection.
- `hooks/useBoardDrag.ts`: Board-local re-export of the shared drag hook, adding a back-compat `activeItemId` → `activeStoryId` alias.
- `hooks/useBoardMilestoneFilter.ts`: Board's milestone combobox filter state, defaulting to the active milestone on mount/project-change.
- `hooks/useBoardStories.ts`: Fetches stories for the board view in a single request with an optional milestone filter.

---

## features/comments/ — Comments section (STORY-008) + permalinks (TASK-009)

- `CommentsPage.tsx`: `/comments/:id` permalink resolver, navigating to the resolved host view and showing a graceful "no longer available" state for a deleted comment.
- `components/CommentsSection.tsx`: Reusable Comments section (Story slide-over / Task Detail modal / Milestone Detail) with a newest-first, always-flat thread and a pinned Add-Comment form.
- `components/CommentRow.tsx`: One comment row, rendering content as Markdown with `@role` mentions and a reply-prefix line derived from its ancestors.
- `components/AddCommentForm.tsx`: Pinned create form above the thread, pre-filling `author_role` from `default_web_ui_role` until edited.
- `components/EditCommentForm.tsx`: Inline edit form for a comment's `content`/`labels`, with `author_role` shown read-only.
- `components/DeleteCommentDialog.tsx`: Delete confirmation dialog, mirroring `DeleteAttachmentDialog`'s contract.
- `components/MentionTextarea.tsx`: Controlled Markdown textarea with `@role` autocomplete, portal-anchored to avoid ancestor overflow clipping.
- `components/MentionBadge.tsx`: Inline badge for a recognized `@role` mention.
- `components/MentionMarkdownSpan.tsx`: `react-markdown` `span` renderer pairing with the mention rehype plugin to render `.mention`-classed spans as `MentionBadge`.
- `components/CommentMarkdownLink.tsx`: `react-markdown` `a` renderer giving client-side navigation to in-app `/comments/:id` links.
- `hooks/useComments.ts`: TanStack Query hooks for Comments, whose mutations invalidate both the container's list and its parent's rich-detail cache.
- `hooks/useCommentHostRoute.ts`: Resolves a comment's `container_type`/`container_id` into an in-app path via direct API calls, staying cross-feature-import-free.
- `hooks/useMentionCombobox.ts`: Drives the `@role` mention autocomplete's ARIA combobox/listbox state, dismissing on Escape before any enclosing modal.
- `utils/mentionRehypePlugin.ts`: Rehype plugin factory splitting `@<role>` tokens into `span.mention`, skipping `code`/`pre`.
- `utils/commentPermalink.ts`: Permalink helpers; the backend contract is root-relative, absolute form only produced for clipboard copy.
- `utils/errorMessages.ts`: Error message extraction.

---

## features/cross-project/ — placeholder

- `CrossProjectPage.tsx`: `/cross-project` route entry, a placeholder until STORY-011 (not yet built).

---

## features/milestones/ — Milestones tab + detail view

- `MilestonesPage.tsx`: Milestones tab at `/projects/:projectId/milestones` with create/edit/delete/activate/finish, confirming before activating over an already-Active milestone.
- `MilestoneDetailPage.tsx`: Detail view at `/milestones/:id` with name, status, description, paginated assigned stories, and Attachments + Comments sections.
- `components/MilestoneList.tsx`: Milestone list rows with status badge, story count, truncated description, and Activate/Finish controls.
- `components/MilestoneForm.tsx`: Create/edit form where `project_id` is immutable once created.
- `components/MilestoneModal.tsx`: Modal wrapper for `MilestoneForm`, native `<dialog>`, focus-trapped, Escape-dismissible.
- `components/ActivateMilestoneDialog.tsx`: Confirms activation when another milestone is already Active, since the backend atomically demotes it.
- `components/DeleteMilestoneDialog.tsx`: Delete confirmation explaining that assigned stories lose their milestone but are not deleted.
- `hooks/useMilestones.ts`: TanStack Query hooks for Milestones, including activate/finish and assigned-stories fetch.
- `utils/errorMessages.ts`: Error message extraction.

---

## features/projects/ — Projects overlay content (STORY-022 Rev 3)

- `components/ProjectsPanelBody.tsx`: Root level of the Projects overlay stack, with list + create/edit/delete rendered inside `OverlayHost`'s panel chrome.
- `components/ProjectList.tsx`: Paginated project list where clicking a name pushes the Settings overlay level rather than navigating.
- `components/ProjectForm.tsx`: Create/edit form with inline 409-conflict error display.
- `components/ProjectModal.tsx`: Modal wrapper for `ProjectForm`, native `<dialog>`, focus-trapped.
- `components/DeleteProjectDialog.tsx`: Delete confirmation explaining cascading deletion of nested data.
- `hooks/useProjects.ts`: TanStack Query hooks for Projects.
- `utils/errorMessages.ts`: Error message extraction.

---

## features/sessions/ — Sessions mode (STORY-009)

- `SessionListPage.tsx`: Sessions list at `/sessions/:projectId`, project-scoped only, with combinable "incomplete only" + "linked to story" filters, an "include archived" toggle, and a per-row delete action (STORY-008 — rendered only for already-archived sessions, wired through `DeleteSessionDialog`/`useDeleteSession`; see `SessionList`).
- `SessionDetailPage.tsx`: Full record at `/sessions/:projectId/:sessionId`, editing every updatable field with a three-way status control, archive action, and — once archived — a Delete action opening `DeleteSessionDialog` (STORY-008); an archived session stays fully editable.
- `components/SessionList.tsx`: Session list rows with topic link, `participant_role`, independent linked-story/linked-task indicators, status chip, and (STORY-008) a Delete row action rendered only when `archived_at` is set — no control at all for a non-archived row.
- `components/SessionForm.tsx`: Create form requiring `topic`/`goal`/`participant_role`, with independent optional story/task links, always starting `pending`.
- `components/SessionEditForm.tsx`: Full-record edit form excluding `status` (owned by `SessionStatusControl`), whose `topic`/`goal`/`participant_role` cannot be cleared.
- `components/SessionModal.tsx`: Modal wrapper for `SessionForm`, native `<dialog>`, focus-trapped.
- `components/SessionStatusBadge.tsx`: Status chip driven directly by the `status` enum.
- `components/SessionStatusControl.tsx`: Three-way status selector, settable to any value in any direction at any time.
- `components/StoryLinkField.tsx`: Optional story-link picker, reading/writing `linked_story_id` only.
- `components/TaskLinkField.tsx`: Optional two-step (story then task) task-link picker, reading/writing `linked_task_id` only.
- `components/LinkedItemDisplay.tsx`: Read-only linked-story/linked-task indicators, each resolved and navigated independently to Task Manager's own detail view.
- `components/ArchiveSessionDialog.tsx`: Archive confirmation, styled non-destructively since archiving is reversible.
- `components/DeleteSessionDialog.tsx`: Delete confirmation dialog (STORY-008), modelled on `DeleteStoryDialog` — destructive-red confirm plus a cannot-be-undone warning, since deletion (unlike archiving) is permanent; shared by `SessionListPage` and `SessionDetailPage`.
- `hooks/useSessions.ts`: TanStack Query hooks for Sessions, always project-scoped; `useDeleteSession` (STORY-008) invalidates the project's session list and removes (not invalidates) the deleted session's detail cache entry, to avoid refetching a now-404 record.
- `utils/validateSessionFields.ts`: Shared required-field validation for create/edit forms, ensuring identical inline error copy across both.
- `utils/errorMessages.ts`: Error message extraction.

---

## features/settings/ — System + Project settings

- `components/SystemSettings.tsx`: View/edit all five global dictionaries plus `default_web_ui_role`, one editor per key, each save sending only that key.
- `components/ProjectSettings.tsx`: View effective settings per project and set/clear overrides, split into a project selector and an effective-settings editor.
- `components/ProjectSettingsPanelBody.tsx`: Second overlay-stack level for one project's dictionary overrides, with an "Open in Task Manager" bridge.
- `components/DictionaryEditor.tsx`: Inline editor for one dictionary key's string array, stateless beyond its own edit buffer.
- `components/LinkTypesEditor.tsx`: Three-field editor dedicated to the `link_types` dictionary, replacing `DictionaryEditor` for that key.
- `components/DefaultWebUiRoleEditor.tsx`: Single-value dropdown editor for `default_web_ui_role`, restricted to current `participantRoles`.
- `hooks/useProjectSettings.ts`: TanStack Query hooks for Project Settings, including effective settings and override set/clear.
- `hooks/useSystemSettings.ts`: TanStack Query hooks for System Settings.

---

## features/stories/ — Story list + detail (includes STORY-006 resizable split)

- `StoriesPage.tsx`: Stories tab at `/projects/:projectId/stories`, recording the active project id for `RootRedirect`.
- `components/StoryList.tsx`: Paginated story table, delegating row actions to the parent via callbacks.
- `components/StoryForm.tsx`: Create/edit form with status from effective `story_statuses`, a milestone dropdown, and the shared `LabelsEditor`.
- `components/StoryModal.tsx`: Modal wrapper for `StoryForm`.
- `components/DeleteStoryDialog.tsx`: Delete confirmation.
- `components/MilestoneAssignment.tsx`: Inline milestone set/clear control in the Story Detail slide-over, self-contained data fetch delegating the update to the parent.
- `components/StorySlideOver.tsx`: Story Detail slide-over at `/projects/:projectId/stories/:storyId`, owning the kanban/`StoryRightPanel` `useResizablePanel` instance shared across every story (STORY-006 TASK-011).
- `components/StoryRightPanel.tsx`: Collapsible right panel (description, milestone, links, attachments, comments) whose width is owned by the parent's `useResizablePanel`.
- `components/TaskKanbanPlaceholder.tsx`: Placeholder kanban with column structure only, superseded by `TaskKanban` once mounted.
- `hooks/useStories.ts`: TanStack Query hooks for Stories.
- `utils/errorMessages.ts`: Error message extraction.

---

## features/story-links/ — Story-to-story links (STORY-006)

- `components/StoryLinksSection.tsx`: Live Links section in the Story slide-over right panel, with direction indicator, `link_type` badge, and per-row delete.
- `components/AddStoryLinkForm.tsx`: Inline create form for a directed story link, excluding the current story from the target selector.
- `components/DeleteStoryLinkDialog.tsx`: Delete confirmation.
- `hooks/useStoryLinks.ts`: TanStack Query hooks for Story Links, whose create/delete invalidate both the link list and the story rich-detail cache.

---

## features/task-links/ — Task-to-task links

- `TaskLinksPage.tsx`: `/task-links` route entry, a placeholder — the full implementation lives in `features/tasks/components/TaskLinksSection.tsx`.
- `hooks/useTaskLinks.ts`: TanStack Query hooks for Task Links, whose create/delete invalidate both the link list and the task rich-detail cache.

---

## features/tasks/ — Task kanban + detail (STORY-005)

- `TasksPage.tsx`: `/tasks` route entry, a placeholder — the real feature is `TaskKanban` mounted inside the Story slide-over.
- `components/TaskKanban.tsx`: Live dictionary-driven task kanban, one column per effective `task_statuses`, with drag, filter bar, and aggregate counter.
- `components/TaskColumn.tsx`: One status column, droppable under id `"col-<status>"`, with an "Add task" button.
- `components/TaskCard.tsx`: Draggable task card showing title/type badge/assignee/labels, with Edit/Delete on hover.
- `components/TaskFilterBar.tsx`: Filter controls above the kanban for type/assignee_role/creator_role, client-side dimming only.
- `components/TaskForm.tsx`: Create/edit form, submit disabled until title/type/status are filled, with `lockedStatus` for column-footer create.
- `components/TaskModal.tsx`: Modal wrapper for `TaskForm`.
- `components/DeleteTaskDialog.tsx`: Delete confirmation.
- `components/TaskDetailModal.tsx`: Full-screen modal at `/projects/:projectId/stories/:storyId/tasks/:taskId`, mounted on top of `StorySlideOver` via its `<Outlet/>`.
- `components/TaskLinksSection.tsx`: Full Links section inside the Task Detail Modal, reading `link_types` and the story's task list from already-cached queries.
- `components/TaskLinkRow.tsx`: One task-link row with direction indicator, badge, and clickable linked-task title.
- `components/AddTaskLinkForm.tsx`: Inline create form for a directed task link, excluding the current task from the target selector.
- `components/DeleteTaskLinkDialog.tsx`: Delete confirmation for a task link.
- `hooks/useTasks.ts`: TanStack Query hooks for Tasks plus the story aggregate query, whose mutations invalidate both the task list and the story aggregate.
- `utils/errorMessages.ts`: Error message extraction.

---

## shared/ — cross-feature primitives (never imports from `features/`)

- `components/IconButton.tsx`: Icon button primitive with `neutral`/`destructive` intents sharing identical size/spacing/radius/focus ring.
- `components/LabelsEditor.tsx`: Controlled editor for key-value label pairs, all state via `value`/`onChange`, no data-fetching.
- `components/SelectField.tsx`: `<select>` primitive owning only a consistently-positioned chevron, with color/size/border passed via `className`.
- `components/PageLoader.tsx`: Full-page loading indicator for lazy-loaded screens, `aria-busy` plus a visually-hidden label.
- `components/PlaceholderScreen.tsx`: Generic "coming soon" screen used by not-yet-implemented areas.
- `components/ProjectLoadError.tsx`: Generic fetch-error message for a failed project-id resolution, shared by `ProjectShell` and the Projects overlay's Settings level.
- `components/ProjectNotFound.tsx`: "Project not found" inline message linking to `/`.
- `components/Toast.tsx`: Transient confirmation/notification banner, purely presentational.
- `components/ResizeHandle.tsx`: Draggable separator between two panels (STORY-006 TASK-009), following the WAI-ARIA window-splitter pattern with pointer drag and Arrow/Home/End keyboard operation.
- `hooks/useResizablePanel.ts`: Session-scoped width model for a drag-resizable panel pair (STORY-006 TASK-008), never persisted to storage so a reload resets to default.
- `hooks/useBoardDrag.ts`: Domain-agnostic dnd-kit wiring for kanban boards, delegating the actual mutation to the caller's `onStatusChange`.
- `hooks/useFocusTrap.ts`: Moves and cycles keyboard focus inside a modal/dialog container, restoring prior focus on unmount.
- `hooks/useModalEscape.ts`: Coordinated Escape-key handling across stacked modals/panels, resolving each press to the topmost registered entry only.
- `hooks/useLocalStorage.ts`: Typed, reactive wrapper over browser localStorage with cross-tab and same-tab sync.
- `hooks/useOverlayStack.ts`: State + controls for the global Projects/Config slide-over overlay, at most one open at a time.
- `hooks/useProjectDetail.ts`: Cross-feature single-project fetch, used by `ProjectShell` to validate the URL's project id.
- `hooks/useProjectList.ts`: Cross-feature project list fetch, used wherever a project selector is needed.
- `hooks/useStoryAggregate.ts`: Cross-feature re-export of the story aggregate hook, avoiding a circular dependency between Stories and Tasks features.
- `hooks/useToast.ts`: Manages a single transient toast message with auto-dismiss, intentionally local per caller.
- `utils/formatTimestamp.ts`: ISO timestamp to display format, promoted from Attachments when Comments became a second consumer.
- `utils/linkLabels.ts`: Link-type/direction label resolution and picker option expansion, shared by task-links and story-links.
- `utils/markdownStyles.ts`: Shared Tailwind class list for `react-markdown` output, promoted from `StoryRightPanel` when Comments needed the same treatment.

---

## Root-level files

- `main.tsx`: Application entry point, mounts `App` to the DOM.
- `vite-env.d.ts`: Vite ambient type declarations.
