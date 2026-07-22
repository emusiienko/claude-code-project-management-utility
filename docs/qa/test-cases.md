# QA Test Cases — Master Index

| ID | Title | Tags | Story | Status |
|----|-------|------|-------|--------|
| [TC-001](test-cases/TC-001-system-settings-screen-visual.md) | System Settings screen — visual pass | @smoke @regression | STORY-002 | Active |
| [TC-002](test-cases/TC-002-project-settings-screen-visual.md) | Project Settings screen — visual pass | @smoke @regression | STORY-002 | Active |
| [TC-003](test-cases/TC-003-edit-dictionary-value-interaction.md) | Edit dictionary value — inline interaction states | @regression | STORY-002 | Active |
| [TC-004](test-cases/TC-004-main-navigation.md) | Main navigation items match planned screens | @smoke @regression | STORY-002 | Inactive — superseded by TC-023, TC-034 (STORY-016) |
| [TC-005](test-cases/TC-005-projects-screen-visual.md) | Projects screen — visual pass | @smoke @regression | STORY-003 | Active |
| [TC-006](test-cases/TC-006-create-project-success.md) | Create project — form open, submit, list refresh | @regression | STORY-003 | Active |
| [TC-007](test-cases/TC-007-create-project-duplicate-name.md) | Create project — duplicate name shows inline conflict error | @regression | STORY-003 | Active |
| [TC-008](test-cases/TC-008-edit-project-success.md) | Edit project — update name and description, list reflects changes | @regression | STORY-003 | Active |
| [TC-009](test-cases/TC-009-edit-project-duplicate-name.md) | Edit project — duplicate name shows inline conflict error | @regression | STORY-003 | Active |
| [TC-010](test-cases/TC-010-delete-project-confirmation.md) | Delete project — confirmation dialog warns about nested data, project is removed | @regression | STORY-003 | Active |
| [TC-011](test-cases/TC-011-projects-empty-state.md) | Projects screen — empty state renders correctly | @regression | STORY-003 | Active |
| [TC-012](test-cases/TC-012-stories-list-view-visual.md) | Stories list view — visual layout | @smoke @regression | STORY-004 | Active |
| [TC-013](test-cases/TC-013-create-story-modal-visual.md) | Create story modal — visual layout | @smoke @regression | STORY-004 | Active |
| [TC-014](test-cases/TC-014-create-story-happy-path.md) | Create story — happy path | @smoke @regression | STORY-004 | Active |
| [TC-015](test-cases/TC-015-create-story-title-validation.md) | Create story — empty title validation | @regression | STORY-004 | Active |
| [TC-016](test-cases/TC-016-edit-story-modal.md) | Edit story — modal pre-filled and save updates in place | @smoke @regression | STORY-004 | Active |
| [TC-017](test-cases/TC-017-delete-story-confirmed.md) | Delete story — confirmation dialog and confirmed delete | @smoke @regression | STORY-004 | Active |
| [TC-018](test-cases/TC-018-delete-story-cancelled.md) | Delete story — cancel from confirmation dialog | @regression | STORY-004 | Active |
| [TC-019](test-cases/TC-019-filter-by-status.md) | Filter bar — filter by status | @regression | STORY-004 | Active |
| [TC-020](test-cases/TC-020-filter-by-label.md) | Filter bar — filter by label key and value | @regression | STORY-004 | Active |
| [TC-021](test-cases/TC-021-empty-state.md) | Empty state — project with no stories | @smoke @regression | STORY-004 | Active |
| [TC-022](test-cases/TC-022-labels-editor.md) | Labels editor — add and remove labels | @regression | STORY-004 | Active |
| [TC-023](test-cases/TC-023-top-bar-app-switcher.md) | Top bar and app switcher | @smoke @regression | STORY-016 | Active |
| [TC-024](test-cases/TC-024-collapsible-sidebar.md) | Collapsible sidebar | @smoke @regression | STORY-016 | Active |
| [TC-025](test-cases/TC-025-sub-nav-four-tabs.md) | Sub-nav — four tabs, active highlight, Milestones placeholder | @smoke @regression | STORY-016 | Active |
| [TC-026](test-cases/TC-026-projects-full-page.md) | /projects — full-page management, no sidebar, no sub-nav | @smoke @regression | STORY-016 | Inactive — superseded by STORY-022 (route removed; project management is now a global overlay) |
| [TC-027](test-cases/TC-027-stories-list-crud.md) | Stories list at /projects/:id/stories — CRUD preserved, title click opens slide-over | @smoke @regression | STORY-016 | Active |
| [TC-028](test-cases/TC-028-board-view.md) | Board view — kanban columns by status, card click opens slide-over | @smoke @regression | STORY-016 | Active |
| [TC-029](test-cases/TC-029-story-detail-slideover.md) | Story Detail slide-over — animation, header, close behaviors, right panel, deep-link | @smoke @regression | STORY-016 | Active |
| [TC-030](test-cases/TC-030-settings-system-only.md) | /settings shows only System Defaults — no Project Overrides tab | @smoke @regression | STORY-016 | Active |
| [TC-031](test-cases/TC-031-project-settings.md) | /projects/:id/settings — project dictionary overrides | @smoke @regression | STORY-016 | Active |
| [TC-032](test-cases/TC-032-root-redirect.md) | / redirect — to last project or /projects | @smoke @regression | STORY-016 | Active |
| [TC-033](test-cases/TC-033-edge-cases-not-found.md) | Edge cases — non-existent project, non-existent story | @regression | STORY-016 | Active |
| [TC-034](test-cases/TC-034-sessions-mode.md) | Sessions mode — no sidebar, no sub-nav, no Settings button | @smoke @regression | STORY-016 | Active |
| [TC-035](test-cases/TC-035-milestones-tab-empty-state.md) | Milestones tab — always present, empty state when no milestones | @smoke @regression | STORY-012 | Active |
| [TC-036](test-cases/TC-036-milestone-create.md) | Create a milestone — required fields, optional description | @smoke @regression | STORY-012 | Active |
| [TC-037](test-cases/TC-037-milestone-list-and-fields.md) | Milestones tab list — name, status badge, story count, description | @smoke @regression | STORY-012 | Active |
| [TC-038](test-cases/TC-038-milestone-edit.md) | Edit a milestone — name and description update | @smoke @regression | STORY-012 | Active |
| [TC-039](test-cases/TC-039-milestone-delete-nullifies-stories.md) | Delete a milestone — assigned stories lose milestone link, stories not deleted | @smoke @regression | STORY-012 | Active |
| [TC-040](test-cases/TC-040-lifecycle-activate-finish.md) | Milestone lifecycle — Planned → Active → Finished → Active (re-activate) | @smoke @regression | STORY-012 | Active |
| [TC-041](test-cases/TC-041-single-active-confirmation.md) | Single-active invariant — confirmation dialog when activating with existing Active milestone | @smoke @regression | STORY-012 | Active |
| [TC-042](test-cases/TC-042-board-active-milestone-filter.md) | Board — milestone combobox defaults to active milestone, re-filters on selection change | @smoke @regression | STORY-012 | Active |
| [TC-043](test-cases/TC-043-board-no-active-milestone.md) | Board — no active milestone defaults combobox to "All stories" | @smoke @regression | STORY-012 | Active |
| [TC-044](test-cases/TC-044-board-empty-state-filtered.md) | Board — empty state when active milestone has no stories assigned | @regression | STORY-012 | Active |
| [TC-045](test-cases/TC-045-board-filter-cleared-on-finish.md) | Board — filter removed when Active milestone is set to Finished | @regression | STORY-012 | Active |
| [TC-046](test-cases/TC-046-story-assignment-set-and-clear.md) | Story form — assign and clear milestone; only same-project milestones shown | @smoke @regression | STORY-012 | Active |
| [TC-047](test-cases/TC-047-story-view-milestone-visible.md) | Story view — current milestone assignment is visible in slide-over and can be changed | @smoke @regression | STORY-012 | Active |
| [TC-048](test-cases/TC-048-milestone-detail-page.md) | Milestone Detail page — shows milestone info and assigned stories list | @smoke @regression | STORY-012 | Active |
| [TC-049](test-cases/TC-049-duplicate-name-error.md) | Edge case — duplicate milestone name within the same project shows conflict error | @regression | STORY-012 | Active |
| [TC-050](test-cases/TC-050-delete-project-removes-milestones.md) | Edge case — deleting a project removes all its milestones; affected stories lose milestone link | @regression | STORY-012 | Active |
| [TC-051](test-cases/TC-051-milestones-tab-visual.md) | Milestones tab — visual layout at all breakpoints | @smoke @regression | STORY-012 | Active |
| [TC-052](test-cases/TC-052-milestone-detail-visual.md) | Milestone Detail page — visual layout at all breakpoints | @smoke @regression | STORY-012 | Active |
| [TC-053](test-cases/TC-053-kanban-board-visual.md) | Task Kanban Board — Visual Layout | @smoke @regression | STORY-005 | Active |
| [TC-054](test-cases/TC-054-create-task.md) | Create Task via Column Footer Button | @smoke @regression | STORY-005 | Active |
| [TC-055](test-cases/TC-055-create-task-full-form.md) | Create Task with All Optional Fields | @regression | STORY-005 | Active |
| [TC-056](test-cases/TC-056-edit-task.md) | Edit Task via Context Menu | @smoke @regression | STORY-005 | Active |
| [TC-057](test-cases/TC-057-delete-task.md) | Delete Task via Context Menu | @smoke @regression | STORY-005 | Active |
| [TC-058](test-cases/TC-058-drag-to-change-status.md) | Drag a Task Card to Change Status | @smoke @regression | STORY-005 | Active |
| [TC-059](test-cases/TC-059-task-detail-modal-open-close.md) | Task Detail Modal — Open, Display, and Close | @smoke @regression | STORY-005 | Active |
| [TC-060](test-cases/TC-060-task-detail-modal-edit-inline.md) | Task Detail Modal — Edit Task Inline | @regression | STORY-005 | Active |
| [TC-061](test-cases/TC-061-task-detail-modal-direct-url.md) | Task Detail Modal — Direct URL Navigation | @regression | STORY-005 | Active |
| [TC-062](test-cases/TC-062-filter-bar-dims-cards.md) | Filter Bar Dims Non-Matching Cards Without API Calls | @regression | STORY-005 | Active |
| [TC-063](test-cases/TC-063-stories-list-aggregate-counter.md) | Stories List Shows Live "N/M Done" Aggregate Counter | @smoke @regression | STORY-005 | Active |
| [TC-064](test-cases/TC-064-not-found-task-url.md) | Non-Existent Task ID in Modal URL Shows "Not Found" | @regression | STORY-005 | Active |
| [TC-065](test-cases/TC-065-empty-kanban.md) | Kanban Board with No Tasks (Empty State) | @regression | STORY-005 | Active |
| [TC-066](test-cases/TC-066-create-task-required-field-validation.md) | Create Task — Required Field Validation (Title and Type) | @regression | STORY-005 | Active |
| [TC-067](test-cases/TC-067-dictionary-dropdowns-populated.md) | Form Dropdowns Populated from Project Effective Settings | @regression | STORY-005 | Active |
| [TC-068](test-cases/TC-068-slideover-panel-width.md) | StorySlideOver Panel Width Is Approximately 90% of Viewport | @regression | STORY-005 | Active |
| [TC-069](test-cases/TC-069-kanban-expands-when-description-hidden.md) | Tasks Kanban Board Expands When Story Description Is Hidden | @regression | STORY-005 | Active |
| [TC-070](test-cases/TC-070-task-links-section-renders.md) | Task Detail Modal — Links section renders correctly | @smoke @regression | STORY-006 | Active |
| [TC-071](test-cases/TC-071-task-link-add-and-display.md) | Task Detail Modal — Add a link between two tasks and verify display | @smoke @regression | STORY-006 | Active |
| [TC-072](test-cases/TC-072-task-link-direction-indicators.md) | Task Detail Modal — Outbound and inbound direction indicators display correctly | @regression | STORY-006 | Active |
| [TC-073](test-cases/TC-073-task-link-title-navigation.md) | Task Detail Modal — Clicking a linked task title navigates to that task's modal | @smoke @regression | STORY-006 | Active |
| [TC-074](test-cases/TC-074-task-link-delete.md) | Task Detail Modal — Delete a task link via confirmation dialog | @smoke @regression | STORY-006 | Active |
| [TC-075](test-cases/TC-075-task-link-delete-cancel.md) | Task Detail Modal — Cancel delete does not remove the task link | @regression | STORY-006 | Active |
| [TC-076](test-cases/TC-076-task-link-self-link-rejected.md) | Task Detail Modal — Self-link attempt shows an error | @regression | STORY-006 | Active |
| [TC-077](test-cases/TC-077-task-link-duplicate-rejected.md) | Task Detail Modal — Duplicate task link attempt shows a conflict error | @regression | STORY-006 | Active |
| [TC-078](test-cases/TC-078-task-links-cascade-delete.md) | Task links disappear after the linked task is deleted | @regression | STORY-006 | Active |
| [TC-079](test-cases/TC-079-story-links-section-renders.md) | Story slide-over — Links section renders correctly | @smoke @regression | STORY-006 | Active |
| [TC-080](test-cases/TC-080-story-link-add-and-display.md) | Story slide-over — Add a story link and verify display | @smoke @regression | STORY-006 | Active |
| [TC-081](test-cases/TC-081-story-link-direction-indicators.md) | Story slide-over — Outbound and inbound direction indicators display correctly | @regression | STORY-006 | Active |
| [TC-082](test-cases/TC-082-story-link-title-navigation.md) | Story slide-over — Clicking a linked story title opens that story's slide-over | @smoke @regression | STORY-006 | Active |
| [TC-083](test-cases/TC-083-story-link-delete.md) | Story slide-over — Delete a story link via confirmation dialog | @smoke @regression | STORY-006 | Active |
| [TC-084](test-cases/TC-084-story-link-self-link-rejected.md) | Story slide-over — Self-link attempt shows an error | @regression | STORY-006 | Active |
| [TC-085](test-cases/TC-085-story-link-duplicate-rejected.md) | Story slide-over — Duplicate story link attempt shows a conflict error | @regression | STORY-006 | Active |
| [TC-086](test-cases/TC-086-story-links-cascade-delete.md) | Story links disappear after the linked story is deleted | @regression | STORY-006 | Active |
| [TC-087](test-cases/TC-087-link-type-dropdown-populated.md) | Add link form — directional dropdown populated from project's effective link_types dictionary | @regression | STORY-006 | Active |
| [TC-088](test-cases/TC-088-task-link-cross-story-not-shown.md) | Task Add link form — tasks from other stories do not appear in search results | @regression | STORY-006 | Active |
| [TC-089](test-cases/TC-089-story-link-cross-project-not-shown.md) | Story Add link form — stories from other projects do not appear in search results | @regression | STORY-006 | Active |
| [TC-090](test-cases/TC-090-outbound-label-display.md) | Task and story link badges show correct outbound labels | @regression | STORY-018 | Active |
| [TC-091](test-cases/TC-091-inbound-label-display.md) | Task and story link badges show correct inbound labels | @regression | STORY-018 | Active |
| [TC-092](test-cases/TC-092-unknown-link-type-fallback.md) | Link badge falls back to raw link_type value for unknown types | @regression | STORY-018 | Active |
| [TC-093](test-cases/TC-093-add-link-dropdown-shows-all-options.md) | Add Link dropdown shows all 6 directional options for known link types | @regression | STORY-019 | Active |
| [TC-094](test-cases/TC-094-outbound-selection-creates-correct-link.md) | Choosing an outbound label creates the link with the current item as source | @regression | STORY-019 | Active |
| [TC-095](test-cases/TC-095-inbound-selection-swaps-source-and-target.md) | Choosing an inbound label creates the link with source and target swapped | @regression | STORY-019 | Active |
| [TC-096](test-cases/TC-096-empty-link-types-shows-placeholder.md) | Add Link form shows placeholder when no link types are configured | @regression | STORY-019 | Active |
| [TC-097](test-cases/TC-097-link-types-editor-system-settings.md) | System Settings page renders link_types as a three-column editor | @smoke @regression | STORY-020 | Active |
| [TC-098](test-cases/TC-098-link-types-editor-project-settings.md) | Project Settings page renders link_types as a three-column editor | @smoke @regression | STORY-020 | Active |
| [TC-099](test-cases/TC-099-add-valid-link-type-entry.md) | Adding a new valid link_types entry with all three fields saves correctly | @smoke @regression | STORY-020 | Active |
| [TC-100](test-cases/TC-100-blank-field-validation.md) | Saving a link_types entry with one or more blank fields shows a validation error | @regression | STORY-020 | Active |
| [TC-101](test-cases/TC-101-duplicate-value-validation.md) | Saving a link_types entry whose Value duplicates an existing entry is rejected | @regression | STORY-020 | Active |
| [TC-102](test-cases/TC-102-remove-link-type-entry.md) | Removing a link_types entry works correctly | @regression | STORY-020 | Active |
| [TC-103](test-cases/TC-103-task-detail-link-labels-from-api.md) | Task Detail modal shows outbound and inbound link labels from the API — not hardcoded | @smoke @regression | STORY-020 | Active |
| [TC-104](test-cases/TC-104-story-slideover-link-labels-from-api.md) | Story slide-over shows outbound and inbound link labels from the API — not hardcoded | @smoke @regression | STORY-020 | Active |
| [TC-105](test-cases/TC-105-add-link-directional-picker.md) | Adding a task or story link — the directional picker populates from structured API data | @smoke @regression | STORY-020 | Active |
| [TC-106](test-cases/TC-106-deleted-link-type-fallback.md) | A link whose type was deleted after creation shows the raw value — no crash | @regression | STORY-020 | Active |
| [TC-107](test-cases/TC-107-project-level-override-takes-precedence.md) | Project-level link_types override is used for that project's links — not the system default | @regression | STORY-020 | Active |
| [TC-108](test-cases/TC-108-symmetric-link-type-valid.md) | A link_types entry with identical outbound and inbound labels is accepted and rendered correctly | @regression | STORY-020 | Active |
| [TC-109](test-cases/TC-109-other-dictionaries-unaffected.md) | Other dictionary sections in Settings are unaffected and still use single-field rows | @smoke @regression | STORY-020 | Active |
| [TC-110](test-cases/TC-110-story-attachments-section-renders.md) | Story slide-over — Attachments section renders correctly | @smoke @regression | STORY-007 | Active |
| [TC-111](test-cases/TC-111-task-attachments-section-renders.md) | Task Detail Modal — Attachments section renders correctly | @smoke @regression | STORY-007 | Active |
| [TC-112](test-cases/TC-112-milestone-attachments-section-renders.md) | Milestone Detail — Attachments section renders correctly | @smoke @regression | STORY-007 | Active |
| [TC-113](test-cases/TC-113-upload-panel-kind-selector.md) | Attachment Upload Panel — kind selector switches the visible fields | @regression | STORY-007 | Active |
| [TC-114](test-cases/TC-114-create-document-write-markdown.md) | Create a document attachment by writing Markdown, and verify display | @smoke @regression | STORY-007 | Active |
| [TC-115](test-cases/TC-115-create-document-upload-file-mode.md) | Create a document attachment by uploading a .md/.txt file | @regression | STORY-007 | Active |
| [TC-116](test-cases/TC-116-create-image-attachment.md) | Create an image attachment (PNG/JPEG/GIF/WEBP) | @regression | STORY-007 | Active |
| [TC-117](test-cases/TC-117-create-file-attachment.md) | Create a file attachment (opaque binary kinds) | @regression | STORY-007 | Active |
| [TC-118](test-cases/TC-118-create-external-ref-attachment.md) | Create an external-reference attachment | @regression | STORY-007 | Active |
| [TC-119](test-cases/TC-119-client-side-size-guard.md) | Selecting a file over 10 MB shows an inline error before upload | @regression | STORY-007 | Active |
| [TC-120](test-cases/TC-120-author-role-optional-field.md) | Author role is optional on every kind and displayed once set | @regression | STORY-007 | Active |
| [TC-121](test-cases/TC-121-view-markdown-document.md) | Viewing a Markdown document attachment opens the in-app viewer, rendered | @smoke @regression | STORY-007 | Active |
| [TC-122](test-cases/TC-122-view-raw-text-document.md) | Viewing a plain text / CSV / JSON document shows raw text in a scrollable block | @regression | STORY-007 | Active |
| [TC-123](test-cases/TC-123-view-image-lightbox.md) | Viewing an image attachment opens a lightbox | @regression | STORY-007 | Active |
| [TC-124](test-cases/TC-124-view-pdf-iframe.md) | Viewing a PDF file attachment opens an embedded viewer | @regression | STORY-007 | Active |
| [TC-125](test-cases/TC-125-docx-xlsx-pptx-zip-download-only.md) | DOCX, XLSX, PPTX, and ZIP attachments offer download only, no in-app viewer | @regression | STORY-007 | Active |
| [TC-126](test-cases/TC-126-view-external-ref-opens-new-tab.md) | Opening an external-reference attachment opens its URL in a new tab | @regression | STORY-007 | Active |
| [TC-127](test-cases/TC-127-viewer-focus-trap-and-escape.md) | Attachment viewer modal traps focus and Escape returns focus to the triggering row | @regression | STORY-007 | Active |
| [TC-128](test-cases/TC-128-download-attachment-file.md) | Downloading a document/image/file attachment retrieves the stored content | @regression | STORY-007 | Active |
| [TC-129](test-cases/TC-129-delete-attachment-confirmed.md) | Delete an attachment via confirmation dialog — permanent removal | @smoke @regression | STORY-007 | Active |
| [TC-130](test-cases/TC-130-delete-attachment-cancelled.md) | Cancelling the delete confirmation leaves the attachment intact | @regression | STORY-007 | Active |
| [TC-131](test-cases/TC-131-type-dropdown-populated.md) | Attachment Type dropdown is populated from the project's effective attachment_types | @regression | STORY-007 | Inactive — Type dropdown/attachment_types dictionary removed by STORY-021 |
| [TC-132](test-cases/TC-132-attachments-consistency-across-hosts.md) | Attachments add/view/delete behave consistently in the Task Detail Modal and Milestone Detail view | @regression | STORY-007 | Active |
| [TC-133](test-cases/TC-133-title-autofill-file-based-kinds.md) | Title field auto-fills from file name for file-based attachment kinds (document-as-file, image, file) | @smoke @regression | STORY-021 | Active |
| [TC-134](test-cases/TC-134-title-no-default-text-and-external-ref.md) | Title has no default value for document-as-text and external-ref kinds, and is required | @smoke @regression | STORY-021 | Active |
| [TC-135](test-cases/TC-135-clearing-autofilled-title-is-rejected.md) | Clearing an auto-filled title (file-upload path) and submitting is rejected, not silently re-defaulted | @regression | STORY-021 | Active |
| [TC-136](test-cases/TC-136-attachment-rows-display-title.md) | Attachment rows display Title instead of Type across Story, Task, and Milestone Attachments sections | @smoke @regression | STORY-021 | Active |
| [TC-137](test-cases/TC-137-settings-no-attachment-types-editor.md) | System and Project Settings screens show five dictionary editors, with no attachment_types editor | @smoke @regression | STORY-021 | Active |
| [TC-138](test-cases/TC-138-regression-attachments-viewer-and-modal-stack.md) | Regression: Attachments viewer, download, delete, and modal-stack Escape behavior are unaffected | @smoke @regression | STORY-021 | Active |
| [TC-139](test-cases/TC-139-story-comments-section-renders.md) | Story slide-over — Comments section renders correctly | @smoke @regression | STORY-008 | Active |
| [TC-140](test-cases/TC-140-task-comments-section-renders.md) | Task Detail Modal — Comments section renders correctly | @smoke @regression | STORY-008 | Active |
| [TC-141](test-cases/TC-141-milestone-comments-section-renders.md) | Milestone Detail — Comments section renders correctly, placeholder note gone | @smoke @regression | STORY-008 | Active |
| [TC-142](test-cases/TC-142-add-comment-happy-path.md) | Add a comment — happy path, author_role pre-fill, form reset | @smoke @regression | STORY-008 | Active |
| [TC-143](test-cases/TC-143-add-comment-validation.md) | Add Comment form validation — disabled submit and inline errors | @regression | STORY-008 | Active |
| [TC-144](test-cases/TC-144-edit-comment.md) | Edit a comment — content and labels editable, author_role read-only | @regression | STORY-008 | Active |
| [TC-145](test-cases/TC-145-comment-labels-independent-update.md) | Comment labels — independent update from content, empty array clears labels | @regression | STORY-008 | Active |
| [TC-146](test-cases/TC-146-delete-comment.md) | Delete a comment — confirmation dialog, permanent removal, count updates | @smoke @regression | STORY-008 | Active |
| [TC-147](test-cases/TC-147-mention-combobox-core-behavior.md) | @role mention combobox — opens, filters, keyboard operable, inserts text | @smoke @regression | STORY-008 | Active |
| [TC-148](test-cases/TC-148-mention-combobox-edge-cases.md) | @role mention combobox — no matches, dismiss and free text after @ | @regression | STORY-008 | Active |
| [TC-149](test-cases/TC-149-mention-render-highlighting.md) | Rendered @role mentions — accent highlight for current roles, plain text otherwise | @smoke @regression | STORY-008 | Active |
| [TC-150](test-cases/TC-150-reply-to-comment.md) | Reply to a comment — chip, dismiss, flat posting, reply-prefix line | @smoke @regression | STORY-008 | Active |
| [TC-151](test-cases/TC-151-multiple-replies-flat-thread.md) | Multiple replies and reply-to-reply — thread stays flat, newest-first | @regression | STORY-008 | Active |
| [TC-152](test-cases/TC-152-copy-link-toast.md) | Copy link — clipboard copy and confirmation toast | @regression | STORY-008 | Active |
| [TC-153](test-cases/TC-153-permalink-navigation.md) | Comment permalink navigation — deep link scrolls and highlights the comment | @smoke @regression | STORY-008 | Active |
| [TC-154](test-cases/TC-154-permalink-deleted-comment.md) | Permalink to a deleted comment — navigates to host view, no error | @regression | STORY-008 | Active |
| [TC-155](test-cases/TC-155-comments-consistency-across-hosts.md) | Comments behave consistently across Story, Task, and Milestone hosts | @regression | STORY-008 | Active |
| [TC-156](test-cases/TC-156-default-web-ui-role-system-settings.md) | Default Web UI role — System Settings dropdown | @regression | STORY-008 | Active |
| [TC-157](test-cases/TC-157-default-web-ui-role-project-override.md) | Default Web UI role — Project Settings override and clear override | @regression | STORY-008 | Active |
| [TC-158](test-cases/TC-158-operator-role-usable-elsewhere.md) | operator role is usable anywhere participant_roles is used | @regression | STORY-008 | Active |
| [TC-159](test-cases/TC-159-long-content-and-thread-volume.md) | Long content and thread volume do not break the Comments section layout | @regression | STORY-008 | Active |
| [TC-160](test-cases/TC-160-global-entry-task-manager-mode.md) | Global Projects entry opens the Projects overlay in Task Manager mode | @smoke @regression | STORY-022 | Active |
| [TC-161](test-cases/TC-161-global-entry-sessions-mode.md) | Global Projects and Config entries visible and functional in Sessions mode | @smoke @regression | STORY-022 | Active |
| [TC-162](test-cases/TC-162-active-page-indication.md) | Open/active indication on both entries, driven by overlay state | @regression | STORY-022 | Active |
| [TC-163](test-cases/TC-163-keyboard-accessibility.md) | Keyboard accessibility of the top-bar triggers and panel controls | @regression | STORY-022 | Active |
| [TC-164](test-cases/TC-164-sidebar-link-removed.md) | Task Manager sidebar "Manage projects" link removed | @smoke @regression | STORY-022 | Active |
| [TC-165](test-cases/TC-165-mode-switch-position-stable.md) | Mode switching does not move or hide the global Projects/Config entries | @regression | STORY-022 | Active |
| [TC-166](test-cases/TC-166-dismisses-open-slideover-and-modal.md) | The overlay opens on top of and stays usable over an open Story slide-over / Task Detail modal | @regression | STORY-022 | Active |
| [TC-167](test-cases/TC-167-visible-in-empty-state.md) | Cold start with zero projects auto-opens the Projects overlay; entries stay functional with/without projects | @regression | STORY-022 | Active |
| [TC-168](test-cases/TC-168-project-name-click-lands-on-settings.md) | Projects overlay: selecting a project pushes its Settings panel (no route change) | @smoke @regression | STORY-022 | Active |
| [TC-169](test-cases/TC-169-sidebar-selection-still-lands-on-stories.md) | Task Manager sidebar project selection still lands on Stories | @regression | STORY-022 | Active |
| [TC-170](test-cases/TC-170-no-overrides-project-lands-on-inherited-settings.md) | Project with no settings overrides — Settings panel shows inherited defaults, no crash | @regression | STORY-022 | Active |
| [TC-171](test-cases/TC-171-top-bar-visual-both-modes.md) | Visual: global entries and the ~70vw overlay panel, across breakpoints and both modes | @regression | STORY-022 | Active |
| [TC-172](test-cases/TC-172-back-vs-dismiss.md) | Back vs Dismiss — distinct stack-pop vs full-close behavior on both overlays | @regression | STORY-022 | Active |
| [TC-173](test-cases/TC-173-open-in-task-manager-bridge.md) | "Open in Task Manager" bridge resolves BUG-006 for a project not yet opened this session | @smoke @regression | STORY-022 | Active |
| [TC-174](test-cases/TC-174-main-view-stays-mounted.md) | The main view never unmounts or navigates while the Projects/Config overlay is open | @regression | STORY-022 | Active |
