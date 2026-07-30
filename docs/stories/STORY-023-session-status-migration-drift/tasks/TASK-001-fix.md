---
status: Done
assignee: backend-developer
story: STORY-023
---

# TASK-001: Fix `session` schema drift from in-place-edited migration

## What to implement
Diagnose the live Docker stack's actual database state (schema + data) for
the `session` table, confirm the specific drift caused by STORY-009
TASK-008's in-place edit of `0013_session`, add a new corrective migration
that converges any database's `session` table to the schema the current
`0013_session.py` describes, and clean up the running dev database's stale
manual-QA session rows.

## Scope
- `backend/migrations/versions/` (new migration)
- Running Docker stack's Postgres database (data cleanup + diagnosis only —
  no application source code changed; the ORM model and current
  `0013_session.py` content were already correct)

## Dependencies
None

## Acceptance Criteria
- [x] Confirmed via `psql` against the running stack's Postgres DB: 24/24
      pre-existing `session` rows, 23 with `status IS NULL` (one had a stale
      `status = 'done'` value that isn't even a valid enum member);
      `is_complete` column still present; `ix_session_project_complete`
      index still present (not `ix_session_project_status`); `alembic_version`
      pinned at `0013_session`.
- [x] New migration added rather than editing `0013_session` again.
- [x] Reproduced the exact drift in an isolated SQLite file (migrate to
      `0012`, manually recreate the *old* `session` shape, stamp
      `alembic_version` at `0013_session`, insert a NULL-status row) and
      confirmed a single `alembic upgrade head` run fixes it: `is_complete`
      dropped, `status` backfilled to `"pending"`, index renamed.
- [x] Full backend test suite run before and after — 578 passed / 3 xfailed
      both times, no regressions.
- [x] Stale session rows removed from the running stack's DB; `GET
      /v1/sessions` confirmed 200 with an empty list; a subsequent `POST` +
      list round-trip confirmed 201/200.

## Intended ADR
None — this is a corrective bugfix migration, not a new architectural
decision. It follows the existing precedent set by `0012_web_ui_role_backfill`
(itself created for an equivalent in-place-edit drift, BUG-001/BUG-004) rather
than establishing a new pattern.

---
## Implementation Report

**Date**: 2026-07-30

**What was done**:
1. Diagnosed the running Docker stack: it uses PostgreSQL (`agents_helper` db
   via `db` container), not SQLite — confirmed via `DATABASE_URL` inside the
   backend container. `\d session` showed the live table still has an
   `is_complete` boolean column and a nullable `status varchar(200)` with no
   default — the *pre*-TASK-008 shape — even though `alembic_version` is
   already at `0013_session` (the current, amended revision id). `SELECT
   count(*) filter (where status is null)` showed 23 of 24 rows NULL; the
   24th had `status = 'done'`, a value from a data model that predates the
   `pending`/`in-progress`/`finished` enum and isn't a valid member of it
   either — confirming these are pre-TASK-008 manual-QA artifacts, not data
   that maps cleanly onto the new schema.
2. Added `backend/migrations/versions/0014_session_status_backfill.py`, a
   new revision (down-revision `0013_session`) rather than a further in-place
   edit — matching the precedent `0012_web_ui_role_backfill` already set for
   this exact failure mode (BUG-001/BUG-004: an in-place-edited migration
   doesn't retroactively apply to a database whose `alembic_version` already
   points at that revision id). It detects the stale shape structurally (the
   presence of `is_complete`) rather than trusting the revision id, so it
   converges correctly regardless of which version of `0013_session` a given
   database originally ran:
   - If `is_complete` is present: backfill any NULL `status` to `"pending"`
     (before tightening the constraint — same add/backfill/tighten order as
     `0010_attachment_title`), tighten `status` to `NOT NULL DEFAULT
     'pending'`, drop `is_complete`, and swap
     `ix_session_project_complete` → `ix_session_project_status` (the index
     the current `0013_session.py` already declares).
   - If absent (fresh install, or already fixed up): no-op.
   - `downgrade()` is a deliberate no-op — see the migration's docstring:
     the post-upgrade table shape is identical whether `upgrade()` fixed
     something or found nothing to fix, so there's no reliable signal to
     invert on, and every downgrade path this repo's tests exercise goes on
     to drop the whole table at `0013_session` regardless.
3. Verified the fix against a reproduction of the exact drift in an isolated
   SQLite file: migrated to `0012_web_ui_role_backfill`, manually recreated
   the *original* `0013_session` table shape (`is_complete` boolean, nullable
   `status`, old index name), inserted a NULL-`status` row, stamped
   `alembic_version` at `0013_session`, then ran `alembic upgrade head`
   exactly as the container entrypoint does. Confirmed: `is_complete` gone,
   `status = "pending"` on the previously-NULL row, `ix_session_project_status`
   present in place of the old index.
4. Ran the full backend test suite before (baseline) and after the migration
   was added: 578 passed, 3 xfailed both times. One intermediate version of
   the migration's `downgrade()` (which tried to symmetrically recreate
   `is_complete`) broke 3 pre-existing tests in
   `tests/test_attachment_title_migration.py::TestDowngrade` that upgrade to
   head then downgrade past `0013_session` — fixed by making `downgrade()`
   the deliberate no-op described above.
5. Cleaned up the running dev stack directly (disposable local data, not
   production, per the task's explicit instruction): deleted all 24 stale
   manual-QA `session` rows via `psql` (none were real project data — `Bulk
   session 01..18`, `Filter A/B - ...`, `Investigate flaky test`, `Design
   review sync`, `Task linking check`, a long-string overflow test row).
   Chose deletion over backfilling their `status` in place because these
   rows were created under a data model (`is_complete`-based, one even with
   a non-enum `status = 'done'`) that has no faithful mapping onto the new
   3-value enum — fabricating a `status` for them would misrepresent what
   they were, and they carry no value worth preserving.
6. Attempted `alembic upgrade head` directly inside the running backend
   container — confirmed it was a no-op (the running container's image was
   built before this migration file existed, so `migrations/versions/` inside
   the container doesn't have `0014` yet; `alembic_version` is still
   `0013_session`). The backend image is built via `COPY` in
   `backend/Dockerfile` (no bind mount), so the new migration file only
   reaches the running stack on the next image rebuild.
7. Confirmed the Sessions list is already unblocked without a rebuild: with
   the stale rows deleted, `GET /v1/sessions?project_id=...` returns `200`
   with an empty list (the crash was row-data-driven, not code-driven — the
   app's own create path always sets `status="pending"` at the service
   layer, so new sessions created through the API were never at risk).
   Verified end-to-end with a `POST /v1/sessions` (201) followed by a list
   call (200, one row), then deleted that verification row to leave the
   table empty.

**Deviations from plan**: None — no plan existed prior to this Quick Fix; the
task description above was written as part of this same pass, per the SDLC
Quick Fix workflow.

**Technical decisions made**:
- New corrective migration (`0014`) instead of a second in-place edit of
  `0013_session`, following the `0012_web_ui_role_backfill` precedent —
  editing `0013_session` again cannot help any database whose
  `alembic_version` already points at that revision id, since Alembic keys
  execution off the revision id, not file content.
- Structural detection (`is_complete` column presence) rather than
  version-comparison logic, so the migration is correct regardless of the
  exact history of how a given database reached `0013_session`.
- `downgrade()` made an explicit no-op rather than attempting a symmetric
  inverse, because the post-upgrade table shape can't distinguish "fixed a
  stale DB" from "found nothing to fix" — see the migration's docstring for
  the full reasoning.
- Chose to delete (not backfill) the running stack's stale test rows, since
  they were created under a schema shape (`is_complete`) that has already
  been fully retired and one row's `status` value (`'done'`) isn't even a
  member of the current enum.

**Code locations**:
- `backend/migrations/versions/0014_session_status_backfill.py` (new)

**Technical debt noted**:
- The running Docker stack still needs a rebuild (`./deploy.sh rebuild`,
  user-run per this project's Infrastructure conventions — not run by this
  agent) before its `session` table schema itself converges (drop
  `is_complete`, tighten `status`, fix the index). The Sessions list already
  works today because the data-level cause (NULL rows) is gone, but the
  schema drift is only closed once the rebuilt image's entrypoint runs
  `alembic upgrade head` and picks up `0014_session_status_backfill`.
- This is the second time an in-place edit of an already-applied-elsewhere
  migration has caused drift on this project (see `0012_web_ui_role_backfill`
  for the first, BUG-001/BUG-004). Worth flagging to the architect: the
  "in-place edit is safe because the table only exists on this unmerged
  branch" reasoning doesn't account for developers who already ran migrations
  against their local dev DB *before* the in-place edit landed — which is
  exactly what happened both times. A convention decision (always add a new
  migration once any environment may have run the old one, even pre-merge)
  may be worth making explicit rather than re-litigating per incident.
