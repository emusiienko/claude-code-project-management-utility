# Frontend Code Map

Module/function-level account of where things live in `frontend/src/`, owned by coder (frontend),
kept current at Reconcile. More granular than the folder-level Repository Structure in root
`CLAUDE.md`. Organized by the repo's existing top-level source folders. Paths below are relative to
`frontend/src/` unless stated otherwise.

---

## api/ — HTTP layer (types, path constants, endpoint functions)

Nothing above this layer calls `fetch` directly; `core/client.ts` is the only thing api/ itself
depends on. Feature hooks (`features/*/hooks/`) are the only consumers of `api/endpoints/*`.

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `api/types.ts` | Canonical TypeScript types derived from the API Contract (LOCKED, currently v1.10) | `Envelope<T>`, `ListEnvelope<T>`, `ApiError`, `Pagination`, `Project`, `Story`, `Task`, `TaskLink`/`EnrichedTaskLink`, `StoryLink`/`EnrichedStoryLink`, `Attachment` (+ `AttachmentKind`, `ContainerType`), `Comment`, `Session` (+ `SessionStatus`), `Milestone` (+ `MilestoneStatus`), `Settings`/`SettingsOverrides` (+ `DictionaryKey`, `LinkTypeEntry`), `StoryAggregate`, `StoryDetail`, `TaskDetail`, `TaskDependencies`, `MilestoneDetail`, one `Create*`/`Update*` pair per domain | Single source of truth for API shapes — never redeclare inline. Per root `CLAUDE.md`: this file also declares types no endpoint currently returns; check the API Contract for what actually exists |
| `api/paths.ts` | Centralized API path constants | `API_PATHS` (one section per domain; parameterized paths are factory functions) | All URL strings live here — never inline in endpoint functions or hooks |
| `api/endpoints/projects.ts` | Projects endpoint functions | `getProjects`, `createProject`, `getProject`, `updateProject`, `deleteProject` | |
| `api/endpoints/stories.ts` | Stories endpoint functions | `StoryFilters`, `listStories`, `createStory`, `getStory`, `updateStory`, `deleteStory` | `GET /stories/:id/aggregate` lives in `tasks.ts` instead (Tasks-domain operation) |
| `api/endpoints/tasks.ts` | Tasks endpoint functions + the story aggregate endpoint | `TaskFilters`, `createTask`, `listTasks`, `getTask`, `getTaskDetail`, `updateTask`, `deleteTask`, `getStoryAggregate` | |
| `api/endpoints/milestones.ts` | Milestones endpoint functions | `MilestoneFilters`, `listMilestones`, `createMilestone`, `getMilestone`, `updateMilestone`, `deleteMilestone`, `activateMilestone`, `finishMilestone`, `listMilestoneStories` | |
| `api/endpoints/sessions.ts` | Sessions endpoint functions | `SessionFilters`, `listSessions`, `createSession`, `getSession`, `updateSession`, `archiveSession` | Endpoint set is STORY-009's, superseding the stale v1.0 forward-spec |
| `api/endpoints/comments.ts` | Comment endpoint functions | `CommentFilters`, `listComments`, `createComment`, `getComment`, `getCommentAncestors`, `updateComment`, `deleteComment` | |
| `api/endpoints/attachments.ts` | Attachment endpoint functions | `AttachmentFilters`, `listAttachments`, `createDocumentAttachment`, `createExternalRefAttachment`, `createStoredFileAttachment`, `getAttachment`, `deleteAttachment`, `getAttachmentFileUrl`, `getAttachmentFileText` | Create/list/get/delete only — no update, no archive (attachments are immutable). Base64 MCP create/read tools have no REST equivalent and are intentionally absent |
| `api/endpoints/storyLinks.ts` | Story links endpoint functions | `StoryLinkFilters`, `createStoryLink`, `listStoryLinks`, `deleteStoryLink` | |
| `api/endpoints/taskLinks.ts` | Task links endpoint functions | `TaskLinkFilters`, `createTaskLink`, `listTaskLinks`, `deleteTaskLink` | |
| `api/endpoints/settings.ts` | Settings endpoint functions | `getSystemSettings`, `updateSystemSettings`, `getProjectSettings`, `getProjectSettingsEffective`, `setProjectOverride`, `clearProjectOverride` | |

---

## app/ — route table, layout shells, top-level navigation surfaces

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `app/App.tsx` | Application root — composes `QueryClientProvider` → `RouterProvider` | `App` | No business logic |
| `app/router.tsx` | Route table, three nesting levels of layout shells | `router` | See file header for the full route tree diagram (RootLayout → SessionsShell/AppShell → ProjectShell → leaf pages). All pages lazy-loaded via `React.lazy` + `Suspense` |
| `app/queryClient.ts` | Singleton TanStack Query client | `queryClient` | Default stale time 0 |
| `app/RootLayout.tsx` | Flat root layout: `TopBar` + `<Outlet/>` + always-mounted `OverlayHost` | `RootLayout` | Owns the `useOverlayStack` instance, one level above both `TopBar` and `OverlayHost` |
| `app/RootRedirect.tsx` | Handles `/` — redirects to last-visited or first project, or opens the Projects overlay when none exist | `LAST_PROJECT_KEY`, `RootRedirect` | `LAST_PROJECT_KEY` is written by the sidebar/project navigation too |
| `app/Layout.tsx` | Root application chrome: top nav bar + `<Outlet/>` | `Layout` | Domain-agnostic, no business logic (legacy top-level layout; distinct from `RootLayout`) |
| `app/TopBar.tsx` | Top bar: app-switcher combobox + Projects/Config overlay triggers | `TopBar` | Overlay triggers, not routed `NavLink`s, since STORY-022 Rev 3. `z-[110]`, highest of any surface — see file header for the full stacking order |
| `app/OverlayHost.tsx` | State-driven slide-over overlay host for Projects and Config | `OverlayHost` | Reuses the Story slide-over's panel chrome; `z-[95]`/`z-[99]` — see file header for the full stacking rationale (BUG-004, BUG-007) |
| `app/AppShell.tsx` | Task Manager mode shell — hosts `ProjectSidebar` + `<Outlet/>` for `/projects/:id/*` | `AppShell` | Owns sidebar collapsed/expanded decision and its own `useResizablePanel` instance (STORY-006 TASK-010), storage key distinct from `SessionsShell`'s |
| `app/ProjectSidebar.tsx` | Collapsible, resizable left sidebar for Task Manager mode | `ProjectSidebarProps`, `ProjectSidebar` | Prop-driven only — `collapsed`/`width` owned by `AppShell`; renders inline pixel `width` or falls back to `w-60` |
| `app/ProjectShell.tsx` | Per-project sub-nav shell — Stories/Board/Milestones tabs + nested `<Outlet/>` | `ProjectShell` | Project Settings is a standalone overlay level, not a tab here |
| `app/SessionsShell.tsx` | Sessions mode shell — mirrors `AppShell` for the whole `/sessions/*` subtree | `SessionsShell` | Owns `SessionsSidebar`'s collapsed decision and its own `useResizablePanel` instance (STORY-006 TASK-010), storage key distinct from `AppShell`'s |
| `app/SessionsSidebar.tsx` | Collapsible, resizable left sidebar for Sessions mode | `LAST_SESSION_PROJECT_KEY`, `SessionsSidebarProps`, `SessionsSidebar` | Structurally mirrors `ProjectSidebar` but a distinct project-selection surface — own localStorage keys throughout |
| `app/SessionsIndexRedirect.tsx` | Handles `/sessions` index — redirects to last-visited or first project within Sessions mode | `SessionsIndexRedirect` | Mirrors `RootRedirect`'s decision tree, scoped to Sessions mode's own last-visited project |
| `app/SessionsProjectGate.tsx` | Validates `:projectId` for Sessions mode | `SessionsProjectGate` | Mirrors `ProjectShell`'s validation |

---

## config/ — cross-cutting constants

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `config/apiConfig.ts` | Pagination limits + TanStack Query stale times | `PAGINATION`, `DATA_FRESHNESS` | Reference these instead of hardcoding numbers inline |
| `config/cacheConfig.ts` | TanStack Query cache key registry | `CACHE_KEYS` | All cache keys live here — never defined inline in hooks; arrays allow invalidation at any granularity |

---

## core/ — HTTP client

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `core/client.ts` | Typed HTTP client wrapping native `fetch` | `ApiRequestError`, `buildApiUrl`, `apiClient` | All API calls must go through this module — never call `fetch` directly from components/screens/hooks. Parses error responses into `ApiError` and re-throws |

---

## features/attachments/ — Attachments section (STORY-007)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `AttachmentsPage.tsx` | `/attachments` route entry | `default AttachmentsScreen` | Placeholder (TASK-007); full feature lives in `AttachmentsSection` instead |
| `components/AttachmentsSection.tsx` | Reusable Attachments section mounted in Story slide-over / Task Detail modal / Milestone Detail | `AttachmentsSection` | Attachments are immutable — create + delete only, no edit |
| `components/AttachmentRow.tsx` | One attachment row (title, kind badge, secondary text, actions) | `AttachmentRow` | Actions vary by kind: external-ref → Open link + Delete; stored-file kinds → View (if renderable) + Download + Delete |
| `components/UploadAttachmentPanel.tsx` | "Add attachment" form covering all four kinds | `UploadAttachmentPanel` | Client-side 10 MB guard + upload progress indicator for files > 1 MB |
| `components/AttachmentViewerModal.tsx` | In-app viewer for renderable stored-file kinds | `AttachmentViewerModal` | Markdown/text/image/PDF by `mime_type`; focus-trapped (`useFocusTrap`); Escape via `useModalEscape` |
| `components/DeleteAttachmentDialog.tsx` | Delete confirmation dialog | `DeleteAttachmentDialog` | Works for every kind |
| `hooks/useAttachments.ts` | TanStack Query hooks for Attachments | `AttachmentFilters`, `CreateAttachmentInput`, `useAttachmentList`, `useAttachment`, `useAttachmentFileText`, `useCreateAttachment`, `useDeleteAttachment` | Mutations invalidate both the container's list and the parent's rich-detail cache |
| `utils/attachmentTitle.ts` | Title length constraint + truncation | `TITLE_MAX_LENGTH`, `truncateTitle` | Mirrors backend's `TITLE_MAX_LENGTH` |
| `utils/mimeAllowList.ts` | Per-kind MIME allow-lists and upload limits | `DOCUMENT_MIME_TYPES`, `IMAGE_MIME_TYPES`, `FILE_MIME_TYPES`, `FILE_KIND_ACCEPT`, `IMAGE_KIND_ACCEPT`, `DOCUMENT_FILE_ACCEPT`, `MAX_UPLOAD_SIZE_BYTES`, `UPLOAD_PROGRESS_THRESHOLD_BYTES`, `detectDocumentMimeType`, `resolveBinaryMimeType` | Mirrors backend's `MIME_ALLOW_LIST_BY_KIND`; client-side checks are a UX guard only |
| `utils/viewerSupport.ts` | Decides how the in-app viewer renders a stored-file attachment | `ViewerRenderMode`, `getViewerRenderMode`, `isViewableMimeType` | Branches purely on `mime_type`, never on `kind` |
| `utils/formatFileSize.ts` | Byte count → human-readable size | `formatFileSize` | |
| `utils/errorMessages.ts` | Error message extraction | `extractErrorMessage`, `extractFieldErrors` | Per-feature copy of the shared error-message pattern |

---

## features/board/ — Story kanban board

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `BoardPage.tsx` | Kanban board at `/projects/:projectId/board` | `default BoardPage` | One column per effective `story_statuses` value; milestone filter (STORY-017); optimistic drag-and-drop via `useUpdateStory` |
| `components/BoardColumn.tsx` | One status column | `columnDroppableId`, `BoardColumn` | `useDroppable` id `"col-<status>"` |
| `components/BoardCard.tsx` | Draggable story card | `BoardCard` | Injects current status into `useSortable`'s `data` for same-column-drop detection |
| `components/BoardMilestoneFilter.tsx` | Milestone combobox in the Board header | `BoardMilestoneFilter` | "All stories" maps to a null selection |
| `hooks/useBoardDrag.ts` | Board-local re-export of the shared drag hook | `resolveTargetStatus` (re-export), `BoardDragHandlers`, `useBoardDrag` | Canonical implementation is `shared/hooks/useBoardDrag.ts`; this file adds a back-compat `activeItemId` → `activeStoryId` alias |
| `hooks/useBoardMilestoneFilter.ts` | Board's milestone combobox filter state | `useBoardMilestoneFilter` | Defaults to the active milestone on mount/project-change; else null (all stories) |
| `hooks/useBoardStories.ts` | Fetches stories for the board view | `useBoardStories` | Single request at `PAGINATION.BOARD_STORIES` (100); optional `milestoneId` filter |

---

## features/comments/ — Comments section (STORY-008) + permalinks (TASK-009)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `CommentsPage.tsx` | `/comments/:id` permalink resolver | `default CommentPermalinkPage` | Resolves host view via `useCommentHostRoute`, navigates once with `scrollToCommentId` in router state; shows a graceful "no longer available" state for a deleted comment |
| `components/CommentsSection.tsx` | Reusable Comments section (Story slide-over / Task Detail modal / Milestone Detail) | `CommentsSection` | Newest-first thread, always flat (no nesting); pinned Add-Comment form; `scrollToCommentId` drives the same jump/highlight path as the local reply-prefix link |
| `components/CommentRow.tsx` | One comment row | `CommentRow` | Reply-prefix line derived from `ancestors[ancestors.length-1]`; renders content as Markdown with `@role` mentions |
| `components/AddCommentForm.tsx` | Pinned create form above the thread | `AddCommentForm` | `author_role` pre-fills from `default_web_ui_role` until the user edits it; parent remounts via `key` to reset after submit |
| `components/EditCommentForm.tsx` | Inline edit form for a comment's `content`/`labels` | `EditCommentForm` | `author_role` shown read-only (immutable) |
| `components/DeleteCommentDialog.tsx` | Delete confirmation dialog | `DeleteCommentDialog` | Mirrors `DeleteAttachmentDialog`'s contract |
| `components/MentionTextarea.tsx` | Controlled Markdown textarea with `@role` autocomplete | `MentionTextarea` | Listbox portal-anchored via `position: fixed` to avoid ancestor `overflow` clipping |
| `components/MentionBadge.tsx` | Inline badge for a recognized `@role` mention | `MentionBadge` | |
| `components/MentionMarkdownSpan.tsx` | `react-markdown` `span` renderer pairing with the mention rehype plugin | `MentionMarkdownSpan` | Renders `.mention`-classed spans as `MentionBadge`, everything else unchanged |
| `components/CommentMarkdownLink.tsx` | `react-markdown` `a` renderer recognizing in-app `/comments/:id` links | `CommentMarkdownLink` | Client-side navigation for matching links; ordinary anchor behavior otherwise |
| `hooks/useComments.ts` | TanStack Query hooks for Comments | `CommentFilters` (re-export), `useCommentList`, `useComment`, `useCommentAncestors`, `useCreateComment`, `useUpdateComment`, `useDeleteComment` | Mutations invalidate both the container's list and its parent's rich-detail cache |
| `hooks/useCommentHostRoute.ts` | Resolves a comment's `container_type`/`container_id` into an in-app path | `CommentHostRoute`, `useCommentHostRoute` | Calls story/task API endpoints directly (not the features' own hooks) to stay cross-feature-import-free, mirroring `useProjectDetail` |
| `hooks/useMentionCombobox.ts` | Drives the `@role` mention autocomplete's ARIA combobox/listbox state | `useMentionCombobox` | Registers on `useModalEscape` so Escape dismisses the combobox before any enclosing modal |
| `utils/mentionRehypePlugin.ts` | Rehype plugin factory splitting `@<role>` tokens into `span.mention` | `createMentionRehypePlugin` | Operates purely on the rendered `hast` tree; skips `code`/`pre` |
| `utils/commentPermalink.ts` | Permalink helpers | `getCommentPermalink`, `parseCommentPermalinkId` | Backend contract is root-relative; absolute form only produced for clipboard copy |
| `utils/errorMessages.ts` | Error message extraction | `extractErrorMessage`, `extractFieldErrors` | |

---

## features/cross-project/ — placeholder

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `CrossProjectPage.tsx` | `/cross-project` route entry | `default CrossProjectScreen` | Placeholder (TASK-007); full implementation is STORY-011 (not yet built) |

---

## features/milestones/ — Milestones tab + detail view

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `MilestonesPage.tsx` | Milestones tab at `/projects/:projectId/milestones` | `default MilestonesPage` | Create/edit/delete/activate/finish; activating over an already-Active milestone confirms first |
| `MilestoneDetailPage.tsx` | Detail view at `/milestones/:id` | `default MilestoneDetailPage` | Name, status, description, paginated assigned stories, Attachments + Comments sections |
| `components/MilestoneList.tsx` | Milestone list rows | `MilestoneList` | Status badge, story count, truncated description, Activate/Finish controls |
| `components/MilestoneForm.tsx` | Create/edit form | `MilestoneFormValues`, `MilestoneForm` | `project_id` immutable once created |
| `components/MilestoneModal.tsx` | Modal wrapper for `MilestoneForm` | `MilestoneModal` | Native `<dialog>`, focus-trapped, Escape-dismissible |
| `components/ActivateMilestoneDialog.tsx` | Confirms activation when another milestone is already Active | `ActivateMilestoneDialog` | Backend atomically demotes the currently-active one |
| `components/DeleteMilestoneDialog.tsx` | Delete confirmation | `DeleteMilestoneDialog` | Explains that assigned stories lose their milestone, are not deleted |
| `hooks/useMilestones.ts` | TanStack Query hooks for Milestones | `useProjectMilestones`, `useMilestone`, `useCreateMilestone`, `useUpdateMilestone`, `useDeleteMilestone`, `useActivateMilestone`, `useFinishMilestone`, `useMilestoneStories` | |
| `utils/errorMessages.ts` | Error message extraction | `extractErrorMessage` | |

---

## features/projects/ — Projects overlay content (STORY-022 Rev 3)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `components/ProjectsPanelBody.tsx` | Root level of the Projects overlay stack | `ProjectsPanelBody` | List + create/edit/delete; renders inside `OverlayHost` which owns the panel chrome |
| `components/ProjectList.tsx` | Paginated project list | `ProjectList` | Name click pushes the Settings overlay level (not a route navigation) |
| `components/ProjectForm.tsx` | Create/edit form | `ProjectFormValues`, `ProjectForm` | Inline 409-conflict error display |
| `components/ProjectModal.tsx` | Modal wrapper for `ProjectForm` | `ProjectModal` | Native `<dialog>`, focus-trapped |
| `components/DeleteProjectDialog.tsx` | Delete confirmation | `DeleteProjectDialog` | Explains cascading deletion of nested data |
| `hooks/useProjects.ts` | TanStack Query hooks for Projects | `useProjectListFull`, `useProjectDetail`, `useCreateProject`, `useUpdateProject`, `useDeleteProject` | |
| `utils/errorMessages.ts` | Error message extraction | `extractErrorMessage` | |

---

## features/sessions/ — Sessions mode (STORY-009)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `SessionListPage.tsx` | Sessions list at `/sessions/:projectId` | `default SessionListPage` | Project-scoped only, no cross-project listing; combinable "incomplete only" + "linked to story" filters, "include archived" toggle |
| `SessionDetailPage.tsx` | Full record at `/sessions/:projectId/:sessionId` | `default SessionDetailPage` | Edits every updatable field, three-way status control, archive action; archiving does not restrict the view |
| `components/SessionList.tsx` | Session list rows | `SessionList` | Topic link, `participant_role`, independent linked-story/linked-task indicators, status chip |
| `components/SessionForm.tsx` | Create form | `SessionCreatePayload`, `SessionForm` | `topic`/`goal`/`participant_role` required; independent optional story/task links; always starts `pending` |
| `components/SessionEditForm.tsx` | Full-record edit form | `SessionEditPayload`, `SessionEditForm` | Excludes `status` (owned by `SessionStatusControl`); `topic`/`goal`/`participant_role` cannot be cleared |
| `components/SessionModal.tsx` | Modal wrapper for `SessionForm` | `SessionModal` | Native `<dialog>`, focus-trapped |
| `components/SessionStatusBadge.tsx` | Status chip | `SESSION_STATUS_LABELS`, `SessionStatusBadge` | Driven directly by the `status` enum |
| `components/SessionStatusControl.tsx` | Three-way status selector | `SessionStatusControl` | Settable to any of the three values, any direction, any time |
| `components/StoryLinkField.tsx` | Optional story-link picker | `StoryLinkField` | Reads/writes `linked_story_id` only, independent of `TaskLinkField` |
| `components/TaskLinkField.tsx` | Optional task-link picker | `TaskLinkField` | Two-step (story then task) picker; reads/writes `linked_task_id` only |
| `components/LinkedItemDisplay.tsx` | Read-only linked-story/linked-task indicators | `LinkedStoryIndicator`, `LinkedTaskIndicator` | Each resolved/rendered/clicked independently; navigates to Task Manager's own detail view |
| `components/ArchiveSessionDialog.tsx` | Archive confirmation | `ArchiveSessionDialog` | Non-destructive-styled (neutral, not red) since archiving is reversible in effect |
| `hooks/useSessions.ts` | TanStack Query hooks for Sessions | `SessionFilters` (re-export), `useSessionList`, `useSession`, `useCreateSession`, `useUpdateSession`, `useArchiveSession` | Always project-scoped |
| `utils/validateSessionFields.ts` | Shared required-field validation for create/edit forms | `SessionRequiredFieldValues`, `SESSION_TEXT_FIELD_MAX_LENGTH`, `validateSessionFields` | Ensures identical inline error copy across both forms |
| `utils/errorMessages.ts` | Error message extraction | `extractErrorMessage`, `extractFieldErrors` | |

---

## features/settings/ — System + Project settings

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `components/SystemSettings.tsx` | View/edit all five global dictionaries + `default_web_ui_role` | `SystemSettings` | One editor per key; each save sends only that key |
| `components/ProjectSettings.tsx` | View effective settings per project, set/clear overrides | `EffectiveSettingsPanel`, `ProjectSettings` | Project selector + effective-settings editor split into two panels |
| `components/ProjectSettingsPanelBody.tsx` | Second overlay-stack level: one project's dictionary overrides | `ProjectSettingsPanelBody` | Own project-existence check via `useProjectDetail`; includes an "Open in Task Manager" bridge |
| `components/DictionaryEditor.tsx` | Inline editor for one dictionary key's string array | `formatKeyLabel`, `DictionaryEditor` | Stateless beyond its own edit buffer; Save disabled on an empty working list |
| `components/LinkTypesEditor.tsx` | Three-field editor for the `link_types` dictionary | `LinkTypesEditor` | Dedicated replacement for `DictionaryEditor`, used only for `link_types` |
| `components/DefaultWebUiRoleEditor.tsx` | Single-value dropdown editor for `default_web_ui_role` | `DefaultWebUiRoleEditor` | Options restricted to current `participantRoles` |
| `hooks/useProjectSettings.ts` | TanStack Query hooks for Project Settings | `useProjectSettings`, `useProjectSettingsEffective`, `useSetProjectOverride`, `useClearProjectOverride` | |
| `hooks/useSystemSettings.ts` | TanStack Query hooks for System Settings | `useSystemSettings`, `useUpdateSystemSettings` | |

---

## features/stories/ — Story list + detail (includes STORY-006 resizable split)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `StoriesPage.tsx` | Stories tab at `/projects/:projectId/stories` | `default StoriesPage` | Records active project id to localStorage for `RootRedirect`; task-aggregate column is "N/A" (STORY-005 scope) |
| `components/StoryList.tsx` | Paginated story table | `StoryList` | Row actions delegated to parent via callbacks |
| `components/StoryForm.tsx` | Create/edit form | `StoryFormValues`, `StoryForm` | Status from effective `story_statuses`, milestone dropdown, shared `LabelsEditor` |
| `components/StoryModal.tsx` | Modal wrapper for `StoryForm` | `StoryModal` | |
| `components/DeleteStoryDialog.tsx` | Delete confirmation | `DeleteStoryDialog` | |
| `components/MilestoneAssignment.tsx` | Inline milestone set/clear control in the Story Detail slide-over | `MilestoneAssignment` | Self-contained data fetch (milestone list), delegates the actual update to the parent |
| `components/StorySlideOver.tsx` | Story Detail slide-over at `/projects/:projectId/stories/:storyId` | `StorySlideOver` | Owns the kanban/`StoryRightPanel` `useResizablePanel` instance (`side: "right"`, single storage key shared across every story — STORY-006 TASK-011); renders `ResizeHandle` between them while the panel is expanded |
| `components/StoryRightPanel.tsx` | Collapsible right panel (description, milestone, links, attachments, comments) | `StoryRightPanel` | Takes `id`/`width` from the parent's `useResizablePanel`; inline pixel width or `w-80` fallback; drops its own left border (separator renders it); collapse transition applied only to the collapsed branch so a live resize never eases |
| `components/TaskKanbanPlaceholder.tsx` | Placeholder kanban (superseded by `TaskKanban` once mounted) | `TaskKanbanPlaceholder` | Column structure only, no live data, no endpoint calls |
| `hooks/useStories.ts` | TanStack Query hooks for Stories | `StoryFilters` (re-export), `useStories`, `useStory`, `useCreateStory`, `useUpdateStory`, `useDeleteStory` | |
| `utils/errorMessages.ts` | Error message extraction | `extractErrorMessage` | |

---

## features/story-links/ — Story-to-story links (STORY-006)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `components/StoryLinksSection.tsx` | Live Links section in the Story slide-over right panel | `StoryLinksSection` | Direction indicator, `link_type` badge, clickable linked-story title, per-row delete, toggled add form |
| `components/AddStoryLinkForm.tsx` | Inline create form for a directed story link | `AddStoryLinkForm` | Target selector excludes the current story; direction swaps source/target for inbound selections |
| `components/DeleteStoryLinkDialog.tsx` | Delete confirmation | `DeleteStoryLinkDialog` | |
| `hooks/useStoryLinks.ts` | TanStack Query hooks for Story Links | `StoryLinkFilters` (re-export), `useStoryLinkList`, `useCreateStoryLink`, `useDeleteStoryLink` | Create/delete invalidate both the link list and the story rich-detail cache |

---

## features/task-links/ — Task-to-task links

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `TaskLinksPage.tsx` | `/task-links` route entry | `default TaskLinksScreen` | Placeholder (TASK-007); full implementation lives in `features/tasks/components/TaskLinksSection.tsx` |
| `hooks/useTaskLinks.ts` | TanStack Query hooks for Task Links | `TaskLinkFilters` (re-export), `useTaskLinkList`, `useCreateTaskLink`, `useDeleteTaskLink` | Create/delete invalidate both the link list and the task rich-detail cache |

---

## features/tasks/ — Task kanban + detail (STORY-005)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `TasksPage.tsx` | `/tasks` route entry | `default TasksScreen` | Placeholder (TASK-007); real feature is `TaskKanban` mounted inside the Story slide-over |
| `components/TaskKanban.tsx` | Live dictionary-driven task kanban | `TaskKanban` | One column per effective `task_statuses`; drag via shared `useBoardDrag`; filter bar; aggregate counter |
| `components/TaskColumn.tsx` | One status column | `columnDroppableId`, `TaskColumn` | `useDroppable` id `"col-<status>"`; "Add task" button |
| `components/TaskCard.tsx` | Draggable task card | `TaskCard` | Title/type badge/assignee/labels; Edit/Delete on hover |
| `components/TaskFilterBar.tsx` | Filter controls above the kanban | `TaskKanbanFilters`, `TaskFilterBar` | type/assignee_role/creator_role dropdowns; client-side dimming only |
| `components/TaskForm.tsx` | Create/edit form | `TaskFormValues`, `TaskForm` | Submit disabled until title/type/status filled; `lockedStatus` for column-footer create |
| `components/TaskModal.tsx` | Modal wrapper for `TaskForm` | `TaskModal` | |
| `components/DeleteTaskDialog.tsx` | Delete confirmation | `DeleteTaskDialog` | |
| `components/TaskDetailModal.tsx` | Full-screen modal at `/projects/:projectId/stories/:storyId/tasks/:taskId` | `TaskDetailModal` | Mounts on top of `StorySlideOver` via its `<Outlet/>`; Escape via `useModalEscape` closes only this modal |
| `components/TaskLinksSection.tsx` | Full Links section inside the Task Detail Modal | `TaskLinksSection` | Reads `link_types` and the story's task list from already-cached queries |
| `components/TaskLinkRow.tsx` | One task-link row | `TaskLinkRow` | Direction indicator + badge + clickable linked-task title |
| `components/AddTaskLinkForm.tsx` | Inline create form for a directed task link | `AddTaskLinkForm` | Target excludes the current task; direction swaps source/target for inbound |
| `components/DeleteTaskLinkDialog.tsx` | Delete confirmation for a task link | `DeleteTaskLinkDialog` | |
| `hooks/useTasks.ts` | TanStack Query hooks for Tasks + the story aggregate query | `TaskFilters` (re-export), `useTaskList`, `useTask`, `useTaskDetail`, `useStoryAggregate`, `useCreateTask`, `useUpdateTask`, `useDeleteTask` | Mutations invalidate both the task list and the story aggregate |
| `utils/errorMessages.ts` | Error message extraction | `extractErrorMessage`, `extractFieldErrors` | |

---

## shared/ — cross-feature primitives (never imports from `features/`)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `components/IconButton.tsx` | Icon button primitive | `IconButtonIntent`, `IconButtonProps`, `IconButton` | `neutral`/`destructive` intents; size/spacing/radius/focus ring identical across intents |
| `components/LabelsEditor.tsx` | Controlled editor for key-value label pairs | `Label` (re-export), `LabelsEditorProps`, `LabelsEditor` | No data-fetching; all state via `value`/`onChange` |
| `components/SelectField.tsx` | `<select>` primitive with a consistently-positioned chevron | `SelectFieldProps`, `SelectField` | Owns chevron layout only; color/size/border passed via `className` |
| `components/PageLoader.tsx` | Full-page loading indicator for lazy-loaded screens | `PageLoader` | `aria-busy` + visually-hidden label (WCAG 2.1 AA) |
| `components/PlaceholderScreen.tsx` | Generic "coming soon" screen | `PlaceholderScreen` | Used by not-yet-implemented areas until their real screen replaces it |
| `components/ProjectLoadError.tsx` | Generic fetch-error message for a failed project-id resolution | `ProjectLoadError` | Shared by `ProjectShell` and the Projects overlay's Settings level |
| `components/ProjectNotFound.tsx` | "Project not found" inline message | `ProjectNotFound` | Links to `/` (Projects has no dedicated route since STORY-022 Rev 3) |
| `components/Toast.tsx` | Transient confirmation/notification banner | `Toast` | Purely presentational; auto-dismiss timing owned by `useToast` |
| `components/ResizeHandle.tsx` | Draggable separator between two panels (STORY-006 TASK-009) | `NUDGE_STEP_PX`, `ResizeHandleProps`, `ResizeHandle` | `role="separator"`, WAI-ARIA window-splitter pattern; pointer drag via `setPointerCapture`, no document-level listener; Arrow/Home/End keyboard operation; holds no width state — forwards everything to the caller's `useResizablePanel` callbacks |
| `hooks/useResizablePanel.ts` | Session-scoped width model for a drag-resizable panel pair (STORY-006 TASK-008) | `PanelSide`, `UseResizablePanelOptions`, `UseResizablePanelResult`, `clampPanelWidth`, `__resetPanelWidths` (test-only), `useResizablePanel` | Chosen width lives in a module-level `Map` keyed by `storageKey` (not the clamped render value), so widening a container restores it in full; never persisted to `localStorage`/`sessionStorage` — reload resets to default. Consumers: `AppShell`, `SessionsShell`, `StorySlideOver` |
| `hooks/useBoardDrag.ts` | Domain-agnostic dnd-kit wiring for kanban boards | `KanbanDragHandlers`, `useBoardDrag`, `resolveTargetStatus` | Delegates the actual mutation to the caller's `onStatusChange`; same-column drops are no-ops, unknown-status drops go to `onInvalidDrop`. Canonical implementation — `features/board/hooks/useBoardDrag.ts` re-exports it |
| `hooks/useFocusTrap.ts` | Moves and cycles keyboard focus inside a modal/dialog container | `useFocusTrap` | Restores prior focus on unmount/deactivation |
| `hooks/useModalEscape.ts` | Coordinated Escape-key handling across stacked modals/panels | `useModalEscape` | Shared stack resolves each Escape press to the topmost registered entry only, replacing independent per-modal `document` listeners (which fired outermost-first regardless of `stopPropagation`) |
| `hooks/useLocalStorage.ts` | Typed, reactive wrapper over browser localStorage | `useLocalStorage` | Cross-tab sync via the `storage` event; same-tab sync via a custom `localstorage-update` event |
| `hooks/useOverlayStack.ts` | State + controls for the global Projects/Config slide-over overlay | `ProjectsOverlayLevel`, `OverlayState`, `OverlayControls`, `hasOverlayDepth`, `useOverlayStack` | At most one stack open at a time (none / Projects / Config); never touches the router |
| `hooks/useProjectDetail.ts` | Cross-feature single-project fetch | `UseProjectDetailResult`, `useProjectDetail` | Used by `ProjectShell` to validate the URL's project id |
| `hooks/useProjectList.ts` | Cross-feature project list fetch | `useProjectList` | Used wherever a project selector is needed |
| `hooks/useStoryAggregate.ts` | Cross-feature re-export of the story aggregate hook | `useStoryAggregate` (re-export from `features/tasks/hooks/useTasks`) | Avoids a circular dependency between Stories and Tasks features |
| `hooks/useToast.ts` | Manages a single transient toast message with auto-dismiss | `UseToastResult`, `useToast` | Intentionally local per caller, not a global store |
| `utils/formatTimestamp.ts` | ISO timestamp → display format | `formatTimestamp` | Promoted from Attachments (STORY-007) when Comments (STORY-008) became a second consumer |
| `utils/linkLabels.ts` | Link-type/direction label resolution + picker option expansion | `Direction`, `getLinkLabel`, `LinkOption`, `getLinkOptions` | Shared by task-links and story-links features; no hardcoded label map |
| `utils/markdownStyles.ts` | Shared Tailwind class list for `react-markdown` output | `MARKDOWN_CONTENT_CLASS` | No `@tailwindcss/typography` dependency; promoted from `StoryRightPanel` when Comments needed the same treatment |

---

## Root-level files

| Module/File | Purpose | Notes |
|---|---|---|
| `main.tsx` | Application entry point (mounts `App` to the DOM) | No exports |
| `vite-env.d.ts` | Vite ambient type declarations | No exports |
