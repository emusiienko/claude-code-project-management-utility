---
id: BUG-004
story: STORY-008
severity: critical
status: fixed
assignee: backend-developer
---

# BUG-004: Migration `0012_default_web_ui_role_backfill` revision id too long for PostgreSQL's `alembic_version.version_num` column

## Description

The BUG-001 fix added migration `backend/migrations/versions/0012_default_web_ui_role_backfill.py` with `revision = "0012_default_web_ui_role_backfill"` — 33 characters. Alembic's bookkeeping table `alembic_version` has a single column, `version_num`, which defaults to `VARCHAR(32)`. SQLite does not enforce `VARCHAR` length limits, so `alembic upgrade head` applied cleanly against the SQLite default used in local dev and the automated test suite, masking the defect during the implementor's own verification of the BUG-001 fix. PostgreSQL enforces the declared length and rejects the `UPDATE`/`INSERT` on `alembic_version` outright, making `./deploy.sh rebuild` fail against the PostgreSQL profile — a full rebuild-blocking regression for any Postgres-backed environment.

Every other revision id in `backend/migrations/versions/` is ≤26 characters (e.g. `0011_comment`, `0010_attachment_title`, `0008_link_types_structured`); the new id broke that convention on top of the length violation.

## Steps to Reproduce
1. Run `./deploy.sh rebuild` (or otherwise `alembic upgrade head`) against a `DATABASE_URL` pointing at PostgreSQL, migrating a database at or below `0011_comment`.
2. Observe the migration step fail.

## Expected Result
Migration `0012` applies successfully on both SQLite and PostgreSQL, backfilling `default_web_ui_role` and `"operator"` as designed by the BUG-001 fix.

## Actual Result
```
sqlalchemy.exc.DataError: (psycopg.errors.StringDataRightTruncation) value too long for type character varying(32)
[SQL: UPDATE alembic_version SET version_num='0012_default_web_ui_role_backfill' WHERE alembic_version.version_num = '0011_comment']
```
`./deploy.sh rebuild` aborts; the stack never comes up on PostgreSQL.

## Additional Info
Reported directly by the user while running `./deploy.sh rebuild` against PostgreSQL.

## Fix Applied

Renamed the migration's revision id (and its filename) from `0012_default_web_ui_role_backfill` (33 chars) to `0012_web_ui_role_backfill` (25 chars) — within the `VARCHAR(32)` limit and consistent with the existing ≤26-character revision id convention:
- `backend/migrations/versions/0012_default_web_ui_role_backfill.py` → `backend/migrations/versions/0012_web_ui_role_backfill.py` (via `git mv`)
- `revision: str = "0012_default_web_ui_role_backfill"` → `revision: str = "0012_web_ui_role_backfill"`
- `down_revision` (`"0011_comment"`) and the `Revises:` docstring line were unchanged — the chain's shape is identical, only this one id's spelling changed
- Added a short note to the migration's module docstring explaining the rename and why (BUG-004), for future readers
- Confirmed no other file in the codebase references the old id as a `down_revision` (this was the current head, so nothing points to it) — safe rename with no chain breakage
- Updated the one prose mention in `CLAUDE.md`'s Code Map and the BUG-001 "Fix Applied" section that named the old filename/revision id, so both stay accurate

**Verification**:
- SQLite: ran the full backend test suite (baseline and post-fix both **517 passed, 2 xfailed** — no regressions), plus a manual `alembic upgrade head` → `alembic downgrade 0011_comment` → `alembic upgrade head` round-trip against a disposable SQLite DB — all steps succeeded, ending back at `0012_web_ui_role_backfill (head)`.
- PostgreSQL: started a throwaway `postgres:18` Docker container (matching the project's pinned Postgres version) and ran the exact same round-trip (`alembic upgrade head` from a fresh DB → `alembic downgrade 0011_comment` → `alembic upgrade head`) with `DATABASE_URL=postgresql+psycopg://...` — the full migration chain applied cleanly with no truncation error. Inspected `alembic_version` directly: `version_num` is confirmed `character varying(32)`, and the new id (`0012_web_ui_role_backfill`, 25 chars) is stored correctly. Container removed after verification.
- Confirmed via `alembic history` that the revision chain (`0011_comment -> 0012_web_ui_role_backfill (head)`) resolves correctly with no orphaned or duplicate revision ids.

Status → `fixed`, ready for QA re-verification.
