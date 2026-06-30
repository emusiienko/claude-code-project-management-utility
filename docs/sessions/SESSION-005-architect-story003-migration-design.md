---
session: SESSION-005
agent: architect
status: completed
---

## Briefing

**Goal**: Review and align on the full migration strategy for STORY-003 (Projects), specifically the cross-story FK dependency, the seed data approach, and any open design concerns before implementation begins.

**Context**:

### What was built in STORY-002 (Settings) — now complete

STORY-002 implemented the Settings domain: system-level dictionary defaults + project-level overrides. The backend is fully implemented (models, repositories, service, REST controller, MCP tools, Alembic migrations).

Migration chain so far:
- `0001_baseline.py` — empty baseline
- `0002_settings_schema.py` — creates `system_settings` and `project_settings` tables
- `0003_settings_seed.py` — seeds the 6 default dictionary keys into `system_settings`

**The FK problem introduced in STORY-002:**
`0002_settings_schema.py` creates `project_settings` with:
```python
ForeignKeyConstraint(["project_id"], ["project.id"], ondelete="CASCADE")
```
The `project` table does not exist at this point in the migration chain. On **SQLite** this works silently (FK references not validated at `CREATE TABLE` time). On **PostgreSQL** this fails immediately — Postgres rejects an FK to a non-existent table.

This means the current `0002` migration is **broken on PostgreSQL**. The user just hit deployment errors trying to bring up the stack with PostgreSQL. The user explicitly authorized editing `0002` to fix this.

### What the architect proposed (inline, during task file creation)

The architect designed these 6 tasks for STORY-003 autonomously:
- **TASK-001**: Edit `0002` to remove the inline FK; create `0004` migration for the `project` table schema + add the deferred FK from `project_settings → project` in the same revision; create `0005` data-seed migration with 1 test project (`"Test Project"`, fixed UUID).
- **TASK-002**: `ProjectService` — CRUD rules, case-insensitive name uniqueness, validation.
- **TASK-003**: REST controller — 5 endpoints per locked API contract.
- **TASK-004**: MCP tools — mirror of the 5 REST operations.
- **TASK-005**: Frontend Project Management screen.
- **TASK-006**: Automated tests (qa-automation).

The task files are at `docs/stories/STORY-003-project-management/tasks/`.

### What the user wants to discuss

The user said "damn, I need a session" after seeing the task breakdown — suggesting concerns or questions about the design. Possible topics (the architect should ask to confirm):

1. **Is editing `0002` the right approach, or is there a cleaner way?** The alternative of adding a stub `project` table migration *before* `0002` (as `0001b` or renumbered) was mentioned but not chosen.

2. **The seed data migration (`0005`)**  — the user added "Add 1 record with a test project" to TASK-001. The architect moved it to a separate `0005` revision following the STORY-002 convention (schema and seed are separate revisions). Is this the right call, or should seed data be handled differently?

3. **Cross-story FK ordering in general** — as more stories add tables with FKs (stories → project, tasks → stories, etc.), this pattern will repeat. Is there a general strategy we should establish now to avoid similar issues in future stories?

4. **`SqlProjectChecker`** — currently in `backend/app/container/project_checker.py`, it queries the `project` table via raw SQL to check project existence without depending on the Projects domain. Once STORY-003 implements the real `Project` model, should `SqlProjectChecker` be replaced by a proper domain dependency, or kept as-is to preserve decoupling?

5. **Cascade delete scope** — TASK-001 adds `ON DELETE CASCADE` from `project_settings → project`. But future stories will add more tables (stories, tasks, etc.) all cascading to `project`. Should the cascade chain be documented now as a constraint, or left implicit?

6. **Anything the user has on their mind** — the architect should ask the user directly what prompted the "I need a session" reaction.

### Key files to read before the session

- `docs/stories/STORY-002-settings/implementation_plan.md`
- `docs/stories/STORY-002-settings/tasks/` — all Implementation Reports
- `backend/migrations/versions/0002_settings_schema.py` — the broken FK is here
- `backend/migrations/versions/0003_settings_seed.py` — seed convention reference
- `docs/stories/STORY-003-project-management/implementation_plan.md`
- `docs/stories/STORY-003-project-management/tasks/TASK-001-project-persistence-migration.md`
- `docs/api-contract.md` — the locked v1.0 contract (projects section)
- `backend/app/container/project_checker.py` — SqlProjectChecker

---

## Report
*(filled by the architect at session end)*

**Decisions made**:

1. **Root cause reframed.** The real problem is not "a misplaced FK" but **table ordering**: a
   child table (`project_settings`) was created before its parent (`project`). PostgreSQL
   validates FK targets at `CREATE TABLE` time and rejected it; SQLite silently tolerated it.

2. **The chain has never been applied.** The first PostgreSQL deployment failed before any
   migration ran, so there is no deployed database and no data to preserve. The append-only
   migration discipline does not apply here — we are free to rewrite the chain for clarity.

3. **Rewrite to a clean 2-revision chain** (instead of the original "edit 0002 + add 0004 with a
   deferred FK via `batch_alter_table`"):
   - `0001_project` (down: None) — creates `project` table **and** seeds one "Test Project" row.
   - `0002_settings` (down: 0001_project) — creates `system_settings` + `project_settings` with
     the `project_settings → project` FK declared **inline** (`ON DELETE CASCADE`), **and** seeds
     the six default dictionaries.
   - Delete `0001_baseline`, `0002_settings_schema`, `0003_settings_seed`.
   - No deferred FK, no `batch_alter_table`, no table rebuild — the inline FK is valid on both
     dialects because `project` exists first.

4. **Seed bundled with schema** — rule applied uniformly: the Test Project seed lives in
   `0001_project`; the six dictionaries live in `0002_settings`. No separate seed revisions.

5. **General migration rule established** (for all future stories): create tables in dependency
   order; declare FKs inline toward already-existing tables; bundle each table's seed in the same
   revision as its schema. With `project` as the root created first, every future FK points
   "upward" to an existing table, so the deferred-FK problem cannot recur.

6. **`SqlProjectChecker` kept as-is** — the settings domain's decoupling from the projects domain
   is intentional and valuable; replacing it with a direct domain dependency is out of scope for
   STORY-003 and adds no value now.

7. **Cascade chain** to be documented as an explicit DB contract (`project` → `project_settings`,
   later stories → tasks → attachments/comments/links) — recorded for the architecture doc at
   Reconcile.

**Open questions**: None blocking. The `architecture.md` migration-ordering rule and cascade-chain
documentation are deferred to Reconcile (the implementation plan and TASK-001 already carry the
rule for the implementor). Local SQLite dev volume must be wiped and re-migrated from empty after
the rewrite (code-free operational reset).

**Summary**: Replaced the original deferred-FK approach for STORY-003 TASK-001 with a clean
two-revision migration chain (`0001_project` + `0002_settings`), root-table-first with inline FKs
and seeds bundled into each schema revision — possible because the chain was never applied.
Updated `tasks/TASK-001-project-persistence-migration.md` and `implementation_plan.md` (Context,
Technical Approach, Ordered Tasks, Planned ADRs, Constraints). TASK-002…006 are unchanged.
