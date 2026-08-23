---
status: Done
assignee: business-analyst
story: STORY-001
---

# TASK-001: business-analyst Setup

## What to implement
Run the business-analyst role's Setup workflow for this project.

## Scope
business-analyst Setup.

## Dependencies
None

## Acceptance Criteria
- [x] business-analyst Setup workflow complete, per the role's own guidelines

## Intended ADR
None

## Implementation Report

**What was done:**
Ran the Setup workflow (Step 0 — Confirm Artifact Formats) in a face-to-face session
(SESSION-001) with the user, confirming, one artifact at a time, all six required decisions:
- Validated Idea: location `.fast-sdlc/requirements/validated_idea/`; format = default template
  as-is; versioning = `file-based-versioning` (default).
- Requirements: location `.fast-sdlc/requirements/specs/`; format = the proposed folder-per-feature
  template (migrated from the prior process's two-domain-document shape, by explicit user choice).
- Documentation: introduced as a new artifact on this project (did not exist before); business-facing
  part at `documentation/business/`, mirroring the Requirements structure but as-built; technical part
  left TBD for architect's own Setup.

Then explicitly adopted/superseded every pre-`fast-sdlc` artifact in my territory, per STORY-001's
edge case:
- Copied `docs/validated-business-idea/latest.md` + `changelog.md` verbatim to the new location;
  added a superseded-notice header to the originals; appended a v3 changelog entry recording the
  location move.
- Migrated `docs/requirements/requirements_backend.md` + `requirements_web.md`: business-facing
  content that was already built moved into `documentation/business/` (12 feature files +
  `data-model.md` + `non-functional.md`); the two genuinely pending gaps found in those documents
  (Web UI "Clear override" not wired end-to-end; Cross-project view is a Web UI placeholder with no
  real screen) moved into `.fast-sdlc/requirements/specs/` as pending feature files; added
  superseded-notice headers to the three original files (`docs/requirements.md` +
  `docs/requirements/requirements_backend.md`/`requirements_web.md`).
- API-contract/endpoint-shape content (HTTP methods, request/response JSON, status codes, rate
  limits) was deliberately **not** migrated anywhere I own — it stays where it already lived
  (`docs/api-contract.md`, architect's), since it is outside business-analyst territory.
- Recorded all location/format decisions in `fast-sdlc-project-setup.md` > Artifacts (Validated
  Business Idea, Requirements, Documentation chapters).
- Created `.fast-sdlc/business-analyst/agent.md` (References) + copied the default Validated Idea
  template into the same folder for future reference.

**Deviations from plan:** None — this is the first Setup pass for this role on this project.

**Technical decisions made:** N/A (business-analyst territory only — no technical decisions).

**Code locations (files created/edited):**
- `.fast-sdlc/requirements/validated_idea/latest.md`, `changelog.md` (new)
- `.fast-sdlc/requirements/specs/index.md`, `clear-project-settings-override.md`,
  `cross-project-view-web-ui.md` (new)
- `documentation/business/index.md`, `data-model.md`, `non-functional.md`,
  `project-management.md`, `settings.md`, `stories.md`, `board-view.md`, `tasks.md`,
  `work-item-linking.md`, `attachments.md`, `comments.md`, `sessions.md`, `milestones.md`,
  `ai-agent-access.md`, `cross-project-queries.md` (new)
- `.fast-sdlc/business-analyst/agent.md`, `validated-idea-format.md` (new)
- `fast-sdlc-project-setup.md` (edited — Artifacts chapters)
- `docs/validated-business-idea/latest.md`, `changelog.md`; `docs/requirements.md`;
  `docs/requirements/requirements_backend.md`, `requirements_web.md` (edited — superseded notices
  only, content otherwise untouched)

**Technical debt noted:** None new. Two pre-existing gaps (settings override clear, cross-project
Web UI view) are now tracked as pending Requirements but not yet turned into Stories — that's a
follow-up action, not part of this Setup task's scope.

---

## Addendum (same session, continued review)

After the above was delivered, the user reviewed it in the same SESSION-001 and drove two further
rounds of correction, both completed before this task closes:

**1. Documentation format revised** (user edited `documentation-format.md` mid-session to a
narrative shape, no longer mirroring Requirements): rewrote `documentation/business/index.md`
(columns `Capability | File | Summary | Access`, dropped Priority) and all 12 capability files into
`Happy Path / Other Scenarios / Who Can Access It / Business Rules / Known Limitations`. Removed
`non-functional.md`'s content entirely (kept only as an inert pointer) per explicit user decision:
non-functional characteristics must reflect real measured values from real tests, so they belong to
technical roles (architect/qa-automation), never business-analyst, in neither Requirements nor
Documentation.

**2. Data model format changed at the source** (user reinstalled the `fast-sdlc` plugin mid-session,
revising `fast-sdlc-business-analyst.md` itself): the single free-form `data-model.md` is retired in
favor of two mandatory structured YAML artifacts — Conceptual and Logical — composed and approved
per subject area (`DATA MODELING` process). Confirmed Step 0 items 6–7 (format, plugin defaults
as-is) with the user, copied both new template files into
`.fast-sdlc/agents/business-analyst/`, then rebuilt the already-built system's data model across 5
subject areas (Project & Work Items, Work Item Linking, Collaboration, Sessions, Settings), each
approved individually (Conceptual, then Logical) before moving to the next — see
`documentation/business/conceptual-data-model/` and `documentation/business/logical-data-model/`.
Notable normalization calls: `Label`/`SettingValue` introduced to resolve repeating groups (1NF);
polymorphic containers (Attachment/Comment/Label owners) modeled as multiple nullable foreign keys;
`Comment.parent_comment_id` adjacency replaces the as-built denormalized `ancestors` path (noted in
`assumptions` as a physical-layer deviation); `Setting` unifies system defaults and project
overrides as one entity distinguished by a nullable `project_id`.

**3. Full audit performed** against both revised formats: found and fixed a stale comment in
`index.md` (referenced the retired `data-model.md`) and a stale future-tense note in the logical
catalog's `assumptions`. Found that the old `data-model.md` — reduced to a pointer stub in step 2,
since business-analyst has no file-delete tool — is not part of the confirmed format at all
(unlike the historical pre-`fast-sdlc` locations, which are legitimately archived elsewhere); user
takes ownership of deleting it manually from the IDE.

**Also relocated during this session** (external edit to `fast-sdlc-project-setup.md`'s Team section
changed each role's folder from `.fast-sdlc/<role>/` to `.fast-sdlc/agents/<role>/`): the
`agent.md`/`validated-idea-format.md` pair originally written to `.fast-sdlc/business-analyst/` now
live at `.fast-sdlc/agents/business-analyst/`, alongside the two new data-model format files and the
refreshed `requirements-format.md`/`documentation-format.md` copies.

**Final code locations, superseding the list above:**
- `.fast-sdlc/agents/business-analyst/agent.md`, `requirements-format.md`,
  `documentation-format.md`, `conceptual-data-model-format.md`, `logical-data-model-format.md`,
  `validated-idea-format.md`
- `documentation/business/index.md`, all 12 capability files (rewritten), `non-functional.md`
  (emptied to a pointer), `data-model.md` (emptied to a pointer, pending manual user deletion)
- `documentation/business/conceptual-data-model/` — `catalog.yaml` +
  `project-and-work-items.yaml`, `work-item-linking.yaml`, `collaboration.yaml`, `sessions.yaml`,
  `settings.yaml`
- `documentation/business/logical-data-model/` — same six files, logical layer
- `.fast-sdlc/requirements/specs/index.md`, `clear-project-settings-override.md` (emptied — no
  longer tracked as pending, by explicit user decision), `cross-project-view-web-ui.md` (same)
- `fast-sdlc-project-setup.md` (Requirements + Documentation chapters, further revised)
