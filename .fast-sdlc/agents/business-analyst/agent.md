# business-analyst — References

## Requirements format
Migrated from the prior process's two-domain-document shape (`requirements_backend.md` /
`requirements_web.md`) to the proposed default template — a folder with `index.md` + one file per
feature (+ `non-functional.md` when needed) — per explicit user choice during Setup (STORY-001),
despite the migration cost, for long-term consistency with how every future feature will be specced.
See `fast-sdlc-project-setup.md` > Artifacts > Requirements for location.

## Data model format (revised 2026-08-23 — plugin reinstall)
The plugin's business-analyst instructions were revised mid-project (user reinstalled the plugin and
refreshed the template files in this folder): the data model is no longer a single free-form
markdown file. It is now **two mandatory structured YAML artifacts** — Conceptual (entities +
relationships, business language, never types/keys) and Logical (complete attributes, identifiers,
foreign keys, normalized to 3NF) — composed and approved **per subject area**, Conceptual before
Logical, via the `DATA MODELING` process. Confirmed Step 0 items 6–7 (format) as the plugin defaults,
as-is, on 2026-08-23. Technical/cross-cutting entities (logs, audit logs, pagination metadata,
caching, sessions/tokens, rate-limiting counters) are explicitly excluded from both layers, even as
an attribute — this did not require any correction against the already-built system, which has no
such entities in business-analyst's territory.

Rebuilt the existing (already fully built) system's data model into this shape across five subject
areas — Project & Work Items, Work Item Linking, Collaboration, Sessions, Settings — each approved
individually by the user in SESSION-001 before moving to the next. Notable normalization decisions
made along the way (see each area's `assumptions` for the full record):
- `Label` (Story/Task/Comment's `labels[]`) and `SettingValue` (a Setting's `values[]`) are both
  introduced as normalized child entities to resolve repeating groups (1NF) — neither is a
  user-facing named concept in the product itself.
- `Attachment`/`Comment`'s polymorphic container (story/task/milestone) and `Label`'s polymorphic
  owner (story/task/comment) are each modeled as multiple nullable foreign keys (one per possible
  owner) rather than a single generic `container_type`/`container_id` pair, since the latter isn't a
  normalized reference.
- `Comment`'s reply relationship is modeled as a single `parent_comment_id` adjacency link; the
  as-built system's denormalized `ancestors` materialized-path cache is a physical-layer read
  optimization, out of scope for the logical model (noted in `assumptions`).
- `Setting` merges system-level defaults and project-level overrides into one entity, distinguished
  by whether its `project_id` is null — they share identical structure and meaning, only scope
  differs.
- Deliberately did **not** model a formal relationship from `Story.status`/`Task.type`/`Task.status`/
  etc. to `Setting` — dictionary validation is a business rule (already captured in each capability's
  prose Business Rules), not a structural entity relationship worth adding to the data model itself.

## Documentation (business-facing part) format
Deliberately a **different shape** from Requirements, per the confirmed `documentation-format.md`
(2026-08-21 revision, superseding the initial "mirrors Requirements" draft): `index.md` uses
`Capability | File | Summary | Access` (no Priority column, no story/task references — those belong
to Requirements, never to Documentation); each capability file is narrative (`Happy Path` / `Other
Scenarios` / `Who Can Access It` / `Business Rules` / `Known Limitations`), not the
validation-rules/error-table shape Requirements uses. One shared `data-model.md` is kept (same shape
as Requirements' own), since entities/fields are reused across capabilities. Non-functional content
(performance/accessibility/browser support) is explicitly **excluded** from this business-facing
part — see the Migration note below. Confirmed with the user during Setup (STORY-001) precisely
because most of the prior process's "requirements" content actually described already-shipped
behavior — this artifact exists specifically to hold that as-built content going forward, keeping
Requirements itself lean (pending scope only). See `fast-sdlc-project-setup.md` > Artifacts >
Documentation for location.

## Migration note (STORY-001, 2026-08-21)
When migrating the prior process's `docs/requirements/requirements_backend.md` and
`requirements_web.md` into the new Documentation/Requirements split, API-contract / endpoint-shape
content (HTTP methods, request/response JSON shapes, status codes, rate limits) was deliberately
**not** migrated — that content is architect's territory (API Contract artifact, `docs/api-contract.md`)
and duplicating it here would immediately drift out of sync with the actual owner. Only business
behavior, data model, and access notes were migrated.

Non-functional characteristics (performance targets, accessibility, browser/device support) were
initially migrated into a `non-functional.md` file, then removed by explicit user decision
(2026-08-21): that content must reflect real values from real tests, not aspirational business
targets, so it belongs to the technical roles that can measure it, not business-analyst — neither in
Requirements nor in this Documentation part. `documentation/business/non-functional.md` is left in
place only as a pointer explaining the removal.

Two known-but-not-yet-commissioned product limitations were found while migrating (settings-override
clear not wired end-to-end; cross-project view still a Web UI placeholder) — by explicit user
decision (2026-08-21), these are **not** modeled as active Requirements, since nobody has decided to
commission the work yet. They are noted as known limitations inline in the relevant Documentation
files (`documentation/business/settings.md`, `documentation/business/cross-project-queries.md`)
instead; `.fast-sdlc/requirements/specs/` is correspondingly empty. If/when either is commissioned,
write it back into Requirements as a proper feature file at that time.

Cross-checked against `docs/stories/archive.md` during the original migration — all 24
pre-`fast-sdlc` stories are `Accepted`, confirming no other pending item was missed there; that file
is a Task Management artifact (not Requirements) and was left untouched.
