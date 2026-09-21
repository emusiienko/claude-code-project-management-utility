# Physical Data Model

Single logical store, DB-agnostic via **SQLAlchemy 2.0 ORM + Alembic migrations**, selected at
runtime by `DATABASE_URL`. **PostgreSQL is the deployment default; SQLite is the opt-in.** The same
ORM models and the same Alembic migration chain run unchanged on both dialects — there is exactly one
physical data model (no persistence map: this is a single-store system). See
[ADR-002](../adr-log/ADR-002-db-agnostic-persistence.md) (DB-agnostic contract) and
[ADR-031](../adr-log/ADR-031-postgres-deployment-default-two-file-env-split.md) (PostgreSQL as the
deployment default, SQLite opt-in).

ORM models and Pydantic API schemas are kept as separate concerns. Migration DDL declares UUID
columns portably as `String(36)`; the dialect abstraction (`UUIDType`) lives in the ORM layer, not in
the migrations.

Throughout: `id`, `created_at`, `updated_at`, and `file_path` are **technical** columns (surrogate
identity, timestamps, server-internal storage path); all other columns are **business-derived**.

**Canonical source for business meaning.** Every business-derived column traces to an entity/attribute
in the **Logical Data Model**, [`documentation/business/logical-data-model/`](../../business/logical-data-model/) — owned by business-analyst,
organized as a shared `catalog.yaml` plus one file per subject area (Project & Work Items, Work Item
Linking, Collaboration, Sessions, Settings). Table and column names here are the physical realization
of those logical names; where the physical shape deviates from the logical one, the logical model's own
`assumptions` records it. Two deviations are known and deliberate, both physical-layer performance
choices with no business-meaning change:

- `comment.ancestors` (a denormalized, materialized root-first reply path — ADR-023) realizes the
  logical model's `Comment.parent_comment_id` adjacency.
- `system_settings` / `project_settings` (two tables, JSON-valued) realize the logical `Setting` entity,
  which models system defaults and project overrides as one entity distinguished by a nullable
  `project_id`; the logical `Label` and `SettingValue` entities (introduced there to resolve repeating
  groups to 1NF) are realized physically as JSON arrays rather than child tables — see ADR-012 for the
  dialect-aware filtering this requires and ADR-022 for the scalar-setting case.

The Logical Data Model post-dates this document (produced during business-analyst's Setup, STORY-001)
and was written from the same as-built system, so the two agree; a future story that changes either
must keep them aligned.

---

## Tables

### project

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | UUID | PK (technical) |
| `name` | text (1–200) | Unique, **case-insensitive** |
| `description` | text | nullable |
| `created_at` | datetime | technical |
| `updated_at` | datetime | technical |

**Uniqueness:** case-insensitive on `name` (dialect-aware `LOWER(name)` functional uniqueness).

---

### story

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | UUID | PK (technical) |
| `project_id` | UUID | FK → `project`, `ON DELETE CASCADE` |
| `title` | text | |
| `content` | text | |
| `status` | text | validated vs the effective `story_statuses` dictionary |
| `labels` | JSON array | free-form key/value pairs |
| `milestone_id` | UUID | FK → `milestone`, `ON DELETE SET NULL`, nullable |
| `created_at` | datetime | technical |
| `updated_at` | datetime | technical |

`milestone_id` shipped as an **FK-less** nullable column in `0003_story`; the FK → `milestone`
(`ON DELETE SET NULL`) was added by `0004_milestone` when the `milestone` table was created. See
ADR-013.

**Indexes:** `(project_id, created_at DESC)`, `(project_id, status)`, `(milestone_id)`.

---

### task

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | UUID | PK (technical) |
| `story_id` | UUID | FK → `story`, `ON DELETE CASCADE` |
| `title` | text | |
| `content` | text | |
| `type` | text | validated vs the effective `task_types` dictionary |
| `status` | text | validated vs the effective `task_statuses` dictionary |
| `assignee_role` | text | validated vs the effective `participant_roles` dictionary |
| `creator_role` | text | validated vs the effective `participant_roles` dictionary |
| `labels` | JSON array | free-form key/value pairs |
| `created_at` | datetime | technical |
| `updated_at` | datetime | technical |

`story_id` is immutable after create. The owning project is resolved transitively
(`task → story → project`) for dictionary validation.

**Indexes:** `(story_id, status)`, `(story_id, type)`, `(assignee_role)`, `(creator_role)`.

---

### task_link

Typed directed links between two tasks in the **same story**.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | UUID | PK (technical) |
| `source_task_id` | UUID | FK → `task`, `ON DELETE CASCADE` |
| `target_task_id` | UUID | FK → `task`, `ON DELETE CASCADE` |
| `link_type` | text | validated vs the effective `link_types` dictionary |

**Uniqueness:** `(source_task_id, target_task_id, link_type)`.
**Application-enforced rules:** `target ≠ source` (no self-link); both tasks in the same story.
**Indexes:** `(source_task_id, link_type)`, `(target_task_id, link_type)`.

---

### story_link

Typed directed links between two stories in the **same project** (net-new table alongside
`task_link`, not a shared polymorphic table — ADR-017).

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | UUID | PK (technical) |
| `source_story_id` | UUID | FK → `story`, `ON DELETE CASCADE` |
| `target_story_id` | UUID | FK → `story`, `ON DELETE CASCADE` |
| `link_type` | text | validated vs the effective `link_types` dictionary |

**Uniqueness:** `(source_story_id, target_story_id, link_type)`.
**Application-enforced rules:** `target ≠ source` (no self-link); both stories in the same project.
**Indexes:** `(source_story_id, link_type)`, `(target_story_id, link_type)`.

---

### attachment

One immutable file (or external reference) per attachment, on any of three container kinds. Content
lives on the attachments filesystem volume, not in the DB. No update endpoint and no archive —
create + delete only.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | UUID | PK (technical) |
| `container_type` | text | `story` \| `task` \| `milestone` |
| `container_id` | UUID | **polymorphic, no FK** (one column cannot reference three tables) — ADR-020 |
| `title` | text (max 500) | mandatory, free-form, **not** dictionary-validated; set once at create |
| `kind` | text | `document` \| `image` \| `file` \| `external-ref` |
| `mime_type` | text | conditional — `document`/`image`/`file` |
| `file_size_bytes` | integer | conditional — `document`/`image`/`file` |
| `file_path` | text | server-internal, **never serialized** (technical) |
| `external_url` | text | conditional — `external-ref` |
| `external_status` | text | nullable |
| `author_role` | text | optional, descriptive |
| `created_at` | datetime | technical |
| `updated_at` | datetime | technical |

Container existence and cascade delete are **application-level** because `container_id` carries no FK
(ADR-020). `file` kind is opaque binary against a curated MIME allow-list. There is no
`attachment_version` table — attachments are immutable (ADR-021, supersedes ADR-005 versioning).

**Index:** `ix_attachment_container_kind` `(container_type, container_id, kind)`.

---

### comment

Markdown comments on stories/tasks/milestones, with reply lineage carried as a materialized ancestor
id-path (there is no thread/parent-child table; a reply is an ordinary flat comment).

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | UUID | PK (technical) |
| `container_type` | text | `story` \| `task` \| `milestone` |
| `container_id` | UUID | **polymorphic, no FK** (same convention as `attachment`) — ADR-020 |
| `author_role` | text | **required, immutable**, free-form |
| `content` | text (1–50,000) | Markdown; length validated at the schema layer |
| `labels` | JSON array | free-form |
| `ancestors` | JSON array | ancestor comment ids, **root-first, immutable** — the materialized reply path (ADR-023) |
| `created_at` | datetime | technical |
| `updated_at` | datetime | technical |

`ancestors` is derived from a request-only `in_reply_to` input (`ancestors = parent.ancestors +
[parent.id]`); `in_reply_to` itself is never stored or returned. `container_id` and the `ancestors`
ids are FK-less, so container existence and cascade delete are application-level. No dictionary-bound
fields.

**Index:** `ix_comment_container_created` `(container_type, container_id, created_at)` — serves the
container-scoped list in either direction (the list is `ORDER BY (created_at, id) DESC`, newest-first
as built; the id tiebreaker keeps ordering stable when timestamps collide).

---

### session

Project-scoped session record; all reads are project-scoped (no cross-project listing).

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | UUID | PK (technical) |
| `project_id` | UUID | FK → `project`, `ON DELETE CASCADE` |
| `topic` | text (1–500) | mandatory |
| `goal` | text (1–500) | mandatory |
| `context` | text | nullable |
| `status` | text | `pending` \| `in-progress` \| `finished`; `NOT NULL`, DDL `server_default 'pending'`; **fixed enum, deliberately not dictionary-validated** (validated at the schema layer) — ADR-026 |
| `participant_role` | text | mandatory, validated vs the effective `participant_roles` dictionary |
| `result_decisions` | text | informational, never affects `status` |
| `result_summary` | text | informational, never affects `status` |
| `linked_story_id` | UUID | FK → `story`, `ON DELETE SET NULL`, nullable |
| `linked_task_id` | UUID | FK → `task`, `ON DELETE SET NULL`, nullable |
| `archived_at` | datetime | nullable |
| `created_at` | datetime | technical |
| `updated_at` | datetime | technical |

`status` is a fixed 3-value lifecycle enum; "incomplete" = `status != finished`. `linked_story_id`
and `linked_task_id` are two **independent** optional links. See ADR-026.

**Indexes:** `ix_session_project_created` `(project_id, created_at)` (project-scoped newest-first
list), `ix_session_project_status` `(project_id, status)` (project-scoped incomplete query),
`ix_session_linked_story` `(linked_story_id)`, `ix_session_linked_task` `(linked_task_id)` (link
filter + reference-clearing on delete).

---

### system_settings

System-level dictionaries plus one scalar setting.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `key` | text | PK — one of the settings keys |
| `values` | JSON | **heterogeneous per-key shape** (see below) |
| `updated_at` | datetime | technical |

The `values` column is heterogeneous: for `link_types` it holds structured objects `{value,
outbound, inbound}` (ADR-019); for `default_web_ui_role` it holds a **bare JSON string** (the only
row shaped that way — ADR-022); for the other four keys it holds a plain-string array.

**Settings keys at `head`:** five dictionaries — `task_statuses`, `task_types`, `story_statuses`,
`link_types`, `participant_roles` — plus one scalar, `default_web_ui_role`. The scalar is validated
on write against the effective `participant_roles` for its scope (422 otherwise); it never
re-validates on read and never constrains a comment's free-form `author_role`.

**`link_types` dictionary shape (ADR-019):** the sole structured dictionary. Each entry is `{value,
outbound, inbound}` — `value` is the machine key stored on `task_link.link_type` /
`story_link.link_type`; `outbound`/`inbound` are the directional display labels. Link-type
validation resolves the effective `link_types` down to the set of `value` strings (the
`EffectiveDictionary.resolve()` contract stays `list[str]`), so TaskLink/StoryLink validation is
unchanged. Structured objects are exposed only through the settings response schemas, not through the
resolution Protocol.

---

### project_settings

Per-project dictionary overrides.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `project_id` | UUID | part of composite PK; FK → `project`, `ON DELETE CASCADE` |
| `key` | text | part of composite PK |
| `values` | JSON | array with ≥1 entry — **fully replaces** the system default (replace-never-merge, ADR-008); same heterogeneous shape as `system_settings` (a `link_types` override stores structured objects) |
| `updated_at` | datetime | technical |

**Primary key:** composite `(project_id, key)`. An absent `(project, key)` row falls through to the
system default.

---

### milestone

Single owning project + lifecycle status.

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | UUID | PK (technical) |
| `project_id` | UUID | FK → `project`, `ON DELETE CASCADE` |
| `name` | text (1–200) | unique within its project, **case-insensitive** |
| `description` | text | nullable |
| `status` | text | `planned` \| `active` \| `finished`; DDL `server_default 'planned'` |
| `created_at` | datetime | technical |
| `updated_at` | datetime | technical |

At most one `active` milestone per project — enforced by the service in the same transaction as
`activate`, **not** by a DB constraint (ADR-016). Single owning project + lifecycle status replace
the former M:N milestone↔project join (ADR-015).

**Indexes:** `ix_milestone_project_id` `(project_id)`, `ix_milestone_project_status` `(project_id,
status)`, `ix_milestone_project_name_lower` `(project_id, LOWER(name))` **unique** (case-insensitive
name uniqueness within a project).

---

## Relations & Cascade

| Parent → Child | FK column | On delete | Enforcement |
|----------------|-----------|-----------|-------------|
| project → story | `story.project_id` | CASCADE | FK (PostgreSQL); inert on SQLite |
| project → milestone | `milestone.project_id` | CASCADE | FK (PostgreSQL); inert on SQLite |
| project → session | `session.project_id` | CASCADE | FK-only (like every project child) |
| story → task | `task.story_id` | CASCADE | FK (PostgreSQL); inert on SQLite |
| story → milestone (assignment) | `story.milestone_id` | SET NULL | FK (PostgreSQL); inert on SQLite |
| task → task_link (either side) | `task_link.source_task_id`, `task_link.target_task_id` | CASCADE | FK **plus** application-level cleanup (ADR-018) |
| story → story_link (either side) | `story_link.source_story_id`, `story_link.target_story_id` | CASCADE | FK **plus** application-level cleanup (ADR-018) |
| story / task / milestone → attachment | `attachment.container_id` (polymorphic, no FK) | — | **application-level only** (ADR-020) |
| story / task / milestone → comment | `comment.container_id` (polymorphic, no FK) | — | **application-level only** (ADR-020) |
| session → story (link) | `session.linked_story_id` | SET NULL | **application-level** in the stories delete cascade (SQLite FK inert — ADR-018 pattern) |
| session → task (link) | `session.linked_task_id` | SET NULL | **application-level** in the tasks delete cascade |

**Application-level vs FK-enforced.** `PRAGMA foreign_keys = ON` is **not** set on the SQLite
connection, so every declared `ON DELETE CASCADE` / `ON DELETE SET NULL` is **inert on SQLite**
(enforced on PostgreSQL). The application therefore performs the equivalent cleanup itself where
correctness on both dialects is required (ADR-018 pattern):

- **Milestone delete** bulk-clears `story.milestone_id` in the service (an explicit `UPDATE`), so
  "delete milestone → stories kept, link cleared" holds on both dialects.
- **Task / story delete** explicitly clears their links (`delete_all_for_*`), attachments (rows +
  stored files), comments (rows), and referencing session links (`linked_story_id` /
  `linked_task_id`) **before** removing the parent, so no orphans remain on either dialect.
- **Attachment / comment cascade is application-level by necessity** — their polymorphic
  `container_id` has no FK at all (ADR-020), so this holds identically on both dialects rather than
  depending on the SQLite PRAGMA gap.

The residual exposure of the SQLite FK gap is where cleanup relies purely on the FK cascade (e.g.
deleting a project to remove child rows on SQLite). Resolution — enabling `PRAGMA foreign_keys = ON`
in the engine and test setup — is tracked as follow-up, out of scope here.

`0004_milestone` also adds the deferred `story.milestone_id` FK (`ON DELETE SET NULL`) at the point
the `milestone` table is created (ADR-013). On SQLite this uses `batch_alter_table` (table rebuild,
constraint `fk_story_milestone_id`) since SQLite cannot `ALTER TABLE ADD CONSTRAINT`; on PostgreSQL
it emits a plain `ADD CONSTRAINT`.

---

## Indexes

| Table | Indexes |
|-------|---------|
| project | (case-insensitive uniqueness on `LOWER(name)`) |
| story | `(project_id, created_at DESC)`, `(project_id, status)`, `(milestone_id)` |
| task | `(story_id, status)`, `(story_id, type)`, `(assignee_role)`, `(creator_role)` |
| task_link | `(source_task_id, link_type)`, `(target_task_id, link_type)`; unique `(source_task_id, target_task_id, link_type)` |
| story_link | `(source_story_id, link_type)`, `(target_story_id, link_type)`; unique `(source_story_id, target_story_id, link_type)` |
| attachment | `ix_attachment_container_kind` `(container_type, container_id, kind)` |
| comment | `ix_comment_container_created` `(container_type, container_id, created_at)` (scanned descending for the newest-first list) |
| session | `ix_session_project_created` `(project_id, created_at)`, `ix_session_project_status` `(project_id, status)`, `ix_session_linked_story` `(linked_story_id)`, `ix_session_linked_task` `(linked_task_id)` |
| milestone | `ix_milestone_project_id` `(project_id)`, `ix_milestone_project_status` `(project_id, status)`, `ix_milestone_project_name_lower` unique `(project_id, LOWER(name))` |

JSON-array (`labels`) filters are not B-tree indexable — acceptable at the ≤1,000-row list scale.

---

## Portability Constraints (SQLite ⇄ PostgreSQL)

- **UUID** — portable UUID type: native `uuid` on PostgreSQL, `CHAR(36)` string on SQLite. The
  dialect abstraction (`UUIDType`) lives in the ORM layer; migration DDL declares UUID columns as
  `String(36)`.
- **`labels` (JSON array)** — JSON type maps to `jsonb` (PostgreSQL) / `JSON` text (SQLite).
  Filtering by `label_key` / `label_value` is **dialect-aware inside the data layer** (`json_each` +
  `json_extract` on SQLite; `jsonb_array_elements` + `@>` containment on PostgreSQL, each inside an
  `EXISTS` subquery), dialect detected via `session.get_bind().dialect.name`. Services and
  controllers see one neutral `label_key` / `label_value` interface. A `label_key` no row carries
  yields an empty page (never an error); `label_key` and `label_value` narrow independently. See
  ADR-012.
- **Case-insensitive uniqueness** (project / milestone name) — implemented dialect-aware via `LOWER()`
  functional uniqueness. The functional `LOWER(name)` unique index is created via
  `op.create_index(..., sa.text("LOWER(name)"))` in the migration (not `__table_args__`), for
  portable reflection across dialects.
- **Concurrency** — SQLite runs in **WAL mode** to allow concurrent reads under the ≥5-request
  concurrency requirement.
- **Migration authoring** — Alembic scripts avoid dialect-only DDL and branch only where
  unavoidable. The chain is authored in **dependency order, root-table-first** (`project` is
  `0001_project`, down `None`), with every FK declared **inline** toward an already-existing parent
  (the one exception is `story.milestone_id`, which ships FK-less and gains its FK when `milestone`
  is created — ADR-013). Each schema revision **bundles its own seed** in the same `upgrade()`. See
  ADR-010.
- **Never edit an already-applied migration in place** — a post-apply schema/seed change ships as a
  **new corrective revision** that detects the stale shape structurally, never as an in-place edit of
  the existing revision (Alembic keys execution off the revision id, not file content). This has been
  needed twice on this project (`0012_web_ui_role_backfill` correcting `0002_settings`;
  `0014_session_status_backfill` correcting `0013_session`). Revision ids are kept ≤ 32 chars for
  PostgreSQL's default `alembic_version.version_num VARCHAR(32)`. See ADR-028 (which narrows ADR-010's
  greenfield-rewrite licence to revisions that have never run anywhere).

---

## Seed Data

Seed data is bundled into the schema revision that creates the table it populates (ADR-010), so
`system_settings` is populated at install with no runtime bootstrap.

- **Test Project** — `0001_project` seeds one project row with fixed UUID
  `00000000-0000-0000-0000-000000000001` and deterministic timestamps.
- **Dictionaries** (`system_settings`, seeded by `0002_settings`) — at `head`:
  - `task_statuses`: `["todo", "in-progress", "done"]`
  - `task_types`: `["task", "bug", "testing-task"]`
  - `story_statuses`: `["planned", "in-progress", "pending-approval", "accepted"]`
  - `link_types` (structured, ADR-019): five entries — `{value: "depends-on", outbound: "depends on",
    inbound: "dependent"}`, `{value: "dependent", outbound: "dependent", inbound: "depends on"}`,
    `{value: "created-by", outbound: "created by", inbound: "creates"}`, `{value: "creates", outbound:
    "creates", inbound: "created by"}`, `{value: "context", outbound: "context", inbound: "context"}`
  - `participant_roles`: `["orchestrator", "architect", "backend-developer", "frontend-developer",
    "devops", "spec-writer", "qa-automation", "manual-qa", "operator"]` (`operator` = the human
    orchestrator driving the Web UI, distinct from the `orchestrator` agent role — ADR-024)
- **`default_web_ui_role`** (scalar, `system_settings`) — `"operator"`, stored as a bare JSON string
  (not a list); the value the Web UI pre-fills into a new comment's `author_role`. See ADR-022.

`0002_settings` seeds six dictionaries on a fresh install, but `0010_attachment_title` deletes the
`attachment_types` rows immediately after, so a DB at `head` carries the five dictionaries above —
`attachment_types` is retired (its sole consumer, the attachment `type` field, is gone).

The `comment` table (`0011_comment`) ships no seed data. A brand-new project requires no
configuration — absent `project_settings` rows fall through to the system defaults.
