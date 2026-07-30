"""Migration tests for 0014_session_status_backfill — STORY-023 (QA Reconcile).

Coverage zones:
- Upgrade against a database stuck in the *stale pre-amendment* `session`
  shape (STORY-009 TASK-008 amended `0013_session` in place; a database whose
  `alembic_version` already pointed at `0013_session` before that edit landed
  never re-runs it — see ADR-028 and the STORY-023 description/task report):
    - Any pre-existing row with `status IS NULL` is backfilled to `"pending"`.
    - A pre-existing row with a stale, non-enum `status` value (e.g. `"done"`,
      a leftover from a data model that predates the 3-value enum) is left
      untouched — the migration only targets NULL, it does not remap invalid
      values (matches the implementor's documented reproduction finding).
    - `is_complete` is dropped; `status` becomes NOT NULL.
    - `ix_session_project_complete` is replaced by `ix_session_project_status`.
- Upgrade on a fresh database (only ever saw the current, amended
  `0013_session`) — detects the already-correct shape structurally and
  no-ops cleanly; no error, no rows.
- Downgrade past this revision is a deliberate no-op (see the migration's own
  docstring) — the table shape is unchanged and no data is lost.

Notes:
- Because `0013_session` was edited *in place* (per the story that motivated
  0014), its old, pre-amendment content no longer exists anywhere in this
  repo to replay via `alembic upgrade`. These tests reconstruct that lost
  shape with raw DDL against a disposable SQLite file — the same
  reproduction method the implementor used manually (see TASK-001's
  Implementation Report) — then stamp `alembic_version` at `0013_session`
  before running the real `0014` `upgrade()`/`downgrade()` functions. This
  exercises the actual migration logic, not a reimplementation of it
  (mirrors `test_attachment_title_migration.py`'s approach for the
  structurally analogous `0010_attachment_title`).
- Every test creates and disposes its own temporary database file.
"""
from __future__ import annotations

import uuid
from pathlib import Path

import alembic.config
import pytest
import sqlalchemy as sa
from alembic import command as alembic_command
from sqlalchemy import create_engine, text

ALEMBIC_INI = Path(__file__).parent.parent / "alembic.ini"

_SEED_PROJECT_ID = "00000000-0000-0000-0000-000000000001"


def _alembic_config(db_url: str) -> alembic.config.Config:
    cfg = alembic.config.Config(str(ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


@pytest.fixture()
def migration_db_url(tmp_path: Path) -> str:
    db_path = tmp_path / "session_migration.db"
    return f"sqlite:///{db_path}"


def _create_legacy_session_table(engine: sa.Engine) -> None:
    """Recreate the *original* pre-TASK-008 `session` shape via raw DDL.

    The real migration file that once created this shape was edited in place
    and no longer exists in the repo — this reconstructs it from the STORY-023
    description/task report (`is_complete` boolean, nullable no-default
    `status`, `ix_session_project_complete` index) so the drift can be
    reproduced and the corrective migration exercised against it.
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE session (
                    id VARCHAR(36) NOT NULL PRIMARY KEY,
                    project_id VARCHAR(36) NOT NULL,
                    topic VARCHAR(500) NOT NULL,
                    goal VARCHAR(500) NOT NULL,
                    context TEXT,
                    status VARCHAR(20),
                    is_complete BOOLEAN,
                    participant_role VARCHAR(200) NOT NULL,
                    result_decisions TEXT,
                    result_summary TEXT,
                    linked_story_id VARCHAR(36),
                    linked_task_id VARCHAR(36),
                    archived_at DATETIME,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    FOREIGN KEY(project_id) REFERENCES project (id) ON DELETE CASCADE,
                    FOREIGN KEY(linked_story_id) REFERENCES story (id) ON DELETE SET NULL,
                    FOREIGN KEY(linked_task_id) REFERENCES task (id) ON DELETE SET NULL
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX ix_session_project_created ON session (project_id, created_at)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX ix_session_project_complete ON session (project_id, is_complete)"
            )
        )
        conn.execute(text("CREATE INDEX ix_session_linked_story ON session (linked_story_id)"))
        conn.execute(text("CREATE INDEX ix_session_linked_task ON session (linked_task_id)"))


def _insert_legacy_session(
    engine: sa.Engine,
    *,
    status: str | None,
    is_complete: bool = False,
    topic: str = "Legacy session",
) -> str:
    """Insert a row shaped like a pre-0014 (stale-schema) session."""
    session_id = str(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO session (
                    id, project_id, topic, goal, context, status, is_complete,
                    participant_role, result_decisions, result_summary,
                    linked_story_id, linked_task_id, archived_at,
                    created_at, updated_at
                ) VALUES (
                    :id, :project_id, :topic, :goal, :context, :status, :is_complete,
                    :participant_role, :result_decisions, :result_summary,
                    :linked_story_id, :linked_task_id, :archived_at,
                    :created_at, :updated_at
                )
                """
            ),
            {
                "id": session_id,
                "project_id": _SEED_PROJECT_ID,
                "topic": topic,
                "goal": "Legacy goal",
                "context": None,
                "status": status,
                "is_complete": is_complete,
                "participant_role": "backend-developer",
                "result_decisions": None,
                "result_summary": None,
                "linked_story_id": None,
                "linked_task_id": None,
                "archived_at": None,
                "created_at": "2026-01-01 00:00:00",
                "updated_at": "2026-01-01 00:00:00",
            },
        )
    return session_id


def _insert_current_session(
    engine: sa.Engine,
    *,
    status: str = "pending",
    topic: str = "Current-shape session",
) -> str:
    """Insert a row shaped like a post-0014 (current, `is_complete`-free) session."""
    session_id = str(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO session (
                    id, project_id, topic, goal, context, status,
                    participant_role, result_decisions, result_summary,
                    linked_story_id, linked_task_id, archived_at,
                    created_at, updated_at
                ) VALUES (
                    :id, :project_id, :topic, :goal, :context, :status,
                    :participant_role, :result_decisions, :result_summary,
                    :linked_story_id, :linked_task_id, :archived_at,
                    :created_at, :updated_at
                )
                """
            ),
            {
                "id": session_id,
                "project_id": _SEED_PROJECT_ID,
                "topic": topic,
                "goal": "Current goal",
                "context": None,
                "status": status,
                "participant_role": "backend-developer",
                "result_decisions": None,
                "result_summary": None,
                "linked_story_id": None,
                "linked_task_id": None,
                "archived_at": None,
                "created_at": "2026-01-01 00:00:00",
                "updated_at": "2026-01-01 00:00:00",
            },
        )
    return session_id


def _table_columns(engine: sa.Engine, table_name: str) -> set[str]:
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return {row[1] for row in rows}


def _index_names(engine: sa.Engine, table_name: str) -> set[str]:
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA index_list({table_name})")).fetchall()
    return {row[1] for row in rows}


def _reproduce_stale_shape(migration_db_url: str) -> tuple[alembic.config.Config, sa.Engine]:
    """Bring a fresh DB to the exact drift STORY-023 diagnosed.

    Migrates to `0012_web_ui_role_backfill` (the real prior revision), then
    recreates the lost pre-amendment `session` shape by hand and stamps
    `alembic_version` at `0013_session` — reproducing a database that ran the
    *original* `0013_session` before it was edited in place.
    """
    cfg = _alembic_config(migration_db_url)
    alembic_command.upgrade(cfg, "0012_web_ui_role_backfill")

    engine = create_engine(migration_db_url)
    _create_legacy_session_table(engine)
    return cfg, engine


# ===========================================================================
# Upgrade — populated database stuck in the stale pre-amendment shape
# ===========================================================================


class TestUpgradeBackfillsStaleShape:
    def test_null_status_backfilled_to_pending(self, migration_db_url: str) -> None:
        cfg, engine = _reproduce_stale_shape(migration_db_url)
        session_id = _insert_legacy_session(engine, status=None)
        alembic_command.stamp(cfg, "0013_session")

        alembic_command.upgrade(cfg, "head")

        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT status FROM session WHERE id = :id"), {"id": session_id}
            ).fetchone()
        assert row is not None, "Session row must survive the migration"
        assert row[0] == "pending", f"NULL status should be backfilled to 'pending', got {row[0]!r}"
        engine.dispose()

    def test_no_row_left_with_null_status(self, migration_db_url: str) -> None:
        cfg, engine = _reproduce_stale_shape(migration_db_url)
        _insert_legacy_session(engine, status=None, topic="Bulk session 01")
        _insert_legacy_session(engine, status=None, topic="Bulk session 02")
        _insert_legacy_session(engine, status="in-progress", topic="Already-set session")
        alembic_command.stamp(cfg, "0013_session")

        alembic_command.upgrade(cfg, "head")

        with engine.connect() as conn:
            null_count = conn.execute(
                text("SELECT COUNT(*) FROM session WHERE status IS NULL")
            ).scalar_one()
        assert null_count == 0, "No session row should be left with a null status"
        engine.dispose()

    def test_stale_non_enum_status_value_left_untouched(self, migration_db_url: str) -> None:
        """A pre-existing `status='done'` row (not a valid enum member, per the
        real drift diagnosed in TASK-001) is not remapped — the migration only
        backfills NULLs, it doesn't validate/correct non-null values."""
        cfg, engine = _reproduce_stale_shape(migration_db_url)
        session_id = _insert_legacy_session(engine, status="done", topic="Stale non-enum row")
        alembic_command.stamp(cfg, "0013_session")

        alembic_command.upgrade(cfg, "head")

        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT status FROM session WHERE id = :id"), {"id": session_id}
            ).fetchone()
        assert row is not None, "Session row must survive the migration"
        assert row[0] == "done", (
            f"A stale non-null status value should be left untouched by the backfill, got {row[0]!r}"
        )
        engine.dispose()

    def test_is_complete_column_dropped_after_upgrade(self, migration_db_url: str) -> None:
        cfg, engine = _reproduce_stale_shape(migration_db_url)
        _insert_legacy_session(engine, status=None)
        alembic_command.stamp(cfg, "0013_session")

        alembic_command.upgrade(cfg, "head")

        columns = _table_columns(engine, "session")
        assert "is_complete" not in columns, f"is_complete should be dropped, got columns: {columns}"
        assert "status" in columns, f"status column should exist, got columns: {columns}"
        engine.dispose()

    def test_status_column_is_not_null_after_upgrade(self, migration_db_url: str) -> None:
        cfg, engine = _reproduce_stale_shape(migration_db_url)
        _insert_legacy_session(engine, status=None)
        alembic_command.stamp(cfg, "0013_session")

        alembic_command.upgrade(cfg, "head")

        with engine.connect() as conn:
            rows = conn.execute(text("PRAGMA table_info(session)")).fetchall()
        status_row = next(r for r in rows if r[1] == "status")
        # PRAGMA table_info: index 3 is `notnull` (1 = NOT NULL)
        assert status_row[3] == 1, "status column should be NOT NULL after upgrade"
        engine.dispose()

    def test_project_status_index_created_project_complete_index_dropped(
        self, migration_db_url: str
    ) -> None:
        cfg, engine = _reproduce_stale_shape(migration_db_url)
        _insert_legacy_session(engine, status=None)
        alembic_command.stamp(cfg, "0013_session")

        alembic_command.upgrade(cfg, "head")

        index_names = _index_names(engine, "session")
        assert "ix_session_project_status" in index_names, (
            f"New status-keyed index should exist, got: {index_names}"
        )
        assert "ix_session_project_complete" not in index_names, (
            f"Old complete-keyed index should be dropped, got: {index_names}"
        )
        engine.dispose()

    def test_row_count_unchanged_after_upgrade(self, migration_db_url: str) -> None:
        cfg, engine = _reproduce_stale_shape(migration_db_url)
        _insert_legacy_session(engine, status=None, topic="A")
        _insert_legacy_session(engine, status=None, topic="B")
        _insert_legacy_session(engine, status="finished", topic="C")
        alembic_command.stamp(cfg, "0013_session")

        alembic_command.upgrade(cfg, "head")

        with engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM session")).scalar_one()
        assert count == 3, f"No rows should be lost by the migration, got {count}"
        engine.dispose()


# ===========================================================================
# Upgrade — fresh database (never saw the stale shape)
# ===========================================================================


class TestUpgradeFreshDatabaseNoOps:
    def test_upgrade_to_head_no_rows_no_error(self, migration_db_url: str) -> None:
        cfg = _alembic_config(migration_db_url)
        # Straight to head — 0014 runs immediately after the current
        # (already-amended) 0013_session creates the correct-shape table.
        alembic_command.upgrade(cfg, "head")

        engine = create_engine(migration_db_url)
        with engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM session")).scalar_one()
        assert count == 0
        columns = _table_columns(engine, "session")
        assert "is_complete" not in columns, f"Fresh install should never have is_complete: {columns}"
        index_names = _index_names(engine, "session")
        assert "ix_session_project_status" in index_names, (
            f"Fresh install should have the current status index: {index_names}"
        )
        engine.dispose()

    def test_upgrade_no_ops_on_a_database_already_fixed_up(self, migration_db_url: str) -> None:
        """A database that already ran 0014 once (or was always correct) must
        stay stable if `alembic upgrade head` is invoked again — 0014's
        structural detection (`is_complete` presence) means the second run
        finds nothing to do, matching the entrypoint's "run on every start"
        pattern (docker-entrypoint.sh runs `alembic upgrade head` on boot)."""
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, "head")

        engine = create_engine(migration_db_url)
        session_id = _insert_current_session(engine, status="in-progress")

        # Already at head — re-running is a normal Alembic no-op (nothing left
        # to apply). This confirms it doesn't error and data is untouched.
        alembic_command.upgrade(cfg, "head")

        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT status FROM session WHERE id = :id"), {"id": session_id}
            ).fetchone()
        assert row is not None, "Session row must survive the re-run"
        assert row[0] == "in-progress", "Re-running upgrade head must not alter existing valid data"
        columns = _table_columns(engine, "session")
        assert "is_complete" not in columns
        engine.dispose()


# ===========================================================================
# Downgrade — deliberate no-op
# ===========================================================================


class TestDowngradeIsNoOp:
    def test_downgrade_past_0014_leaves_schema_unchanged(self, migration_db_url: str) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, "head")

        engine = create_engine(migration_db_url)
        session_id = _insert_current_session(engine, status="pending")
        columns_before = _table_columns(engine, "session")
        index_names_before = _index_names(engine, "session")

        alembic_command.downgrade(cfg, "0013_session")

        columns_after = _table_columns(engine, "session")
        index_names_after = _index_names(engine, "session")
        assert columns_after == columns_before, (
            "Downgrade past 0014 should be a documented no-op — schema must be unchanged"
        )
        assert index_names_after == index_names_before, (
            "Downgrade past 0014 should be a documented no-op — indexes must be unchanged"
        )

        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT status FROM session WHERE id = :id"), {"id": session_id}
            ).fetchone()
        assert row is not None, "Downgrade must not lose data (no-op, not a table rebuild)"
        assert row[0] == "pending"
        engine.dispose()
