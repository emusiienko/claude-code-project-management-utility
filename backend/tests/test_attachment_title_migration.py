"""Migration tests for 0010_attachment_title — STORY-021 / TASK-006.

Coverage zones:
- Upgrade against a *populated* database (mirrors production: 0009_attachment already
  deployed with real attachment rows carrying `type`, no `title`):
    - Every pre-existing attachment row ends up with a non-null `title`, backfilled
      from its former `type` value.
    - The `type` column is gone after upgrade; `title` is NOT NULL.
    - The `attachment_types` dictionary rows are deleted from both `system_settings`
      and `project_settings`.
- Upgrade on a fresh database (no attachment rows yet) — no error, no orphaned rows.
- Downgrade restores `type` (backfilled from `title`, truncated to 100 chars), removes
  `title`, and re-seeds the system-level `attachment_types` default (project-level
  overrides are not recoverable — this is documented, expected, destructive-downgrade
  behavior, not a bug).

Notes:
- These tests run the *real* Alembic upgrade()/downgrade() functions for 0010 against
  a private, disposable SQLite file — not the shared session-scoped tests/test.db —
  so they can stop at 0009_attachment, seed legacy-shaped rows, then upgrade one step
  further. This exercises the actual `op.batch_alter_table` / index-swap / raw-SQL
  logic, not a reimplementation of it (contrast with the 0008 migration's tests,
  which test pure-Python helper functions — 0010 has no such helpers to unit test).
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

# The last revision before attachment moved to container FKs (0015): these tests
# insert rows in the container_type/container_id shape, so they stop there.
_PRE_CONTAINER_FK_REVISION = "0014_session_status_backfill"

_ATTACHMENT_TYPES_SEED_VALUES = [
    "plan",
    "document",
    "image",
    "implementation-report",
    "test-result",
    "external-ref",
]


def _alembic_config(db_url: str) -> alembic.config.Config:
    cfg = alembic.config.Config(str(ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


@pytest.fixture()
def migration_db_url(tmp_path: Path) -> str:
    db_path = tmp_path / "attachment_migration.db"
    return f"sqlite:///{db_path}"


def _insert_legacy_attachment(
    engine: sa.Engine,
    *,
    container_type: str = "story",
    container_id: str | None = None,
    type_value: str = "document",
    kind: str = "document",
) -> str:
    """Insert a row shaped like a pre-0010 attachment (has `type`, no `title`)."""
    attachment_id = str(uuid.uuid4())
    container_id = container_id or str(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO attachment (
                    id, container_type, container_id, type, kind, mime_type,
                    file_size_bytes, file_path, external_url, external_status,
                    author_role, created_at, updated_at
                ) VALUES (
                    :id, :container_type, :container_id, :type, :kind, :mime_type,
                    :file_size_bytes, :file_path, :external_url, :external_status,
                    :author_role, :created_at, :updated_at
                )
                """),
            {
                "id": attachment_id,
                "container_type": container_type,
                "container_id": container_id,
                "type": type_value,
                "kind": kind,
                "mime_type": "text/markdown",
                "file_size_bytes": 42,
                "file_path": f"{container_type}/{container_id}/{attachment_id}",
                "external_url": None,
                "external_status": None,
                "author_role": None,
                "created_at": "2026-01-01 00:00:00",
                "updated_at": "2026-01-01 00:00:00",
            },
        )
    return attachment_id


def _table_columns(engine: sa.Engine, table_name: str) -> set[str]:
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return {row[1] for row in rows}


def _dictionary_keys(
    engine: sa.Engine, table: str, project_id: str | None = None
) -> list[str]:
    with engine.connect() as conn:
        if project_id is None:
            rows = conn.execute(
                text(f"SELECT key FROM {table}")
            ).fetchall()  # noqa: S608
        else:
            rows = conn.execute(
                text(f"SELECT key FROM {table} WHERE project_id = :pid"),  # noqa: S608
                {"pid": project_id},
            ).fetchall()
    return [row[0] for row in rows]


# ===========================================================================
# Upgrade — populated database (real forward migration + backfill)
# ===========================================================================


class TestUpgradeBackfillsExistingRows:
    def test_title_backfilled_from_type_for_existing_row(
        self, migration_db_url: str
    ) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, "0009_attachment")

        engine = create_engine(migration_db_url)
        attachment_id = _insert_legacy_attachment(
            engine, type_value="implementation-report"
        )

        alembic_command.upgrade(cfg, "0010_attachment_title")

        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT title FROM attachment WHERE id = :id"),
                {"id": attachment_id},
            ).fetchone()
        assert row is not None, "Attachment row must survive the migration"
        assert (
            row[0] == "implementation-report"
        ), f"title should be backfilled from the row's former type value, got {row[0]!r}"
        engine.dispose()

    def test_no_row_left_with_null_title(self, migration_db_url: str) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, "0009_attachment")

        engine = create_engine(migration_db_url)
        _insert_legacy_attachment(engine, type_value="plan")
        _insert_legacy_attachment(engine, type_value="test-result", kind="file")
        _insert_legacy_attachment(
            engine, type_value="external-ref", kind="external-ref"
        )

        alembic_command.upgrade(cfg, "0010_attachment_title")

        with engine.connect() as conn:
            null_count = conn.execute(
                text("SELECT COUNT(*) FROM attachment WHERE title IS NULL")
            ).scalar_one()
        assert null_count == 0, "No attachment row should be left with a null title"
        engine.dispose()

    def test_type_column_removed_after_upgrade(self, migration_db_url: str) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, "0009_attachment")

        engine = create_engine(migration_db_url)
        _insert_legacy_attachment(engine)

        alembic_command.upgrade(cfg, "0010_attachment_title")

        columns = _table_columns(engine, "attachment")
        assert (
            "type" not in columns
        ), f"type column should be dropped, got columns: {columns}"
        assert "title" in columns, f"title column should exist, got columns: {columns}"
        engine.dispose()

    def test_title_column_is_not_null(self, migration_db_url: str) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, "0009_attachment")

        engine = create_engine(migration_db_url)
        _insert_legacy_attachment(engine)
        alembic_command.upgrade(cfg, "0010_attachment_title")

        with engine.connect() as conn:
            rows = conn.execute(text("PRAGMA table_info(attachment)")).fetchall()
        title_row = next(r for r in rows if r[1] == "title")
        # PRAGMA table_info: index 3 is `notnull` (1 = NOT NULL)
        assert title_row[3] == 1, "title column should be NOT NULL after upgrade"
        engine.dispose()

    def test_container_kind_index_created_container_type_index_dropped(
        self, migration_db_url: str
    ) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, "0009_attachment")

        engine = create_engine(migration_db_url)
        _insert_legacy_attachment(engine)
        alembic_command.upgrade(cfg, "0010_attachment_title")

        with engine.connect() as conn:
            index_names = {
                row[1]
                for row in conn.execute(
                    text("PRAGMA index_list(attachment)")
                ).fetchall()
            }
        assert (
            "ix_attachment_container_kind" in index_names
        ), f"New kind-keyed index should exist, got: {index_names}"
        assert (
            "ix_attachment_container_type" not in index_names
        ), f"Old type-keyed index should be dropped, got: {index_names}"
        engine.dispose()


class TestUpgradeFreshDatabase:
    def test_upgrade_to_head_no_rows_no_error(self, migration_db_url: str) -> None:
        cfg = _alembic_config(migration_db_url)
        # Straight to head on a brand-new DB — 0010 runs immediately after
        # 0009_attachment creates an empty table.
        alembic_command.upgrade(cfg, _PRE_CONTAINER_FK_REVISION)

        engine = create_engine(migration_db_url)
        with engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM attachment")).scalar_one()
        assert count == 0
        engine.dispose()


# ===========================================================================
# attachment_types settings rows deleted by the upgrade
# ===========================================================================


class TestUpgradeDeletesAttachmentTypesSettingsRows:
    def test_system_settings_attachment_types_row_deleted(
        self, migration_db_url: str
    ) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, "0009_attachment")

        engine = create_engine(migration_db_url)
        keys_before = _dictionary_keys(engine, "system_settings")
        assert (
            "attachment_types" in keys_before
        ), "Precondition: 0002_settings seeds attachment_types on system_settings"

        alembic_command.upgrade(cfg, "0010_attachment_title")

        keys_after = _dictionary_keys(engine, "system_settings")
        assert (
            "attachment_types" not in keys_after
        ), f"attachment_types row should be deleted from system_settings, got: {keys_after}"
        engine.dispose()

    def test_project_settings_attachment_types_override_deleted(
        self, migration_db_url: str
    ) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, "0009_attachment")

        engine = create_engine(migration_db_url)
        project_id = str(uuid.uuid4())
        with engine.begin() as conn:
            # 0001_project seeds one default project; insert a second real
            # project row so the project_settings FK is satisfied.
            conn.execute(
                text(
                    "INSERT INTO project (id, name, created_at, updated_at) "
                    "VALUES (:id, :name, :created_at, :updated_at)"
                ),
                {
                    "id": project_id,
                    "name": "Migration Test Project",
                    "created_at": "2026-01-01 00:00:00",
                    "updated_at": "2026-01-01 00:00:00",
                },
            )
            conn.execute(
                text(
                    'INSERT INTO project_settings (project_id, key, "values", updated_at) '
                    "VALUES (:pid, :key, :values, :updated_at)"
                ),
                {
                    "pid": project_id,
                    "key": "attachment_types",
                    "values": '["custom-project-type"]',
                    "updated_at": "2026-01-01 00:00:00",
                },
            )

        alembic_command.upgrade(cfg, "0010_attachment_title")

        keys_after = _dictionary_keys(engine, "project_settings", project_id=project_id)
        assert (
            "attachment_types" not in keys_after
        ), f"Project-level attachment_types override should be deleted, got: {keys_after}"
        engine.dispose()


# ===========================================================================
# Downgrade — restores `type`, truncated; re-seeds system-level default only
# ===========================================================================


class TestDowngrade:
    def test_downgrade_restores_type_backfilled_from_title(
        self, migration_db_url: str
    ) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, _PRE_CONTAINER_FK_REVISION)

        engine = create_engine(migration_db_url)
        attachment_id = str(uuid.uuid4())
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO attachment (
                        id, container_type, container_id, title, kind, mime_type,
                        file_size_bytes, file_path, external_url, external_status,
                        author_role, created_at, updated_at
                    ) VALUES (
                        :id, :container_type, :container_id, :title, :kind, :mime_type,
                        :file_size_bytes, :file_path, :external_url, :external_status,
                        :author_role, :created_at, :updated_at
                    )
                    """),
                {
                    "id": attachment_id,
                    "container_type": "story",
                    "container_id": str(uuid.uuid4()),
                    "title": "My Report",
                    "kind": "document",
                    "mime_type": "text/markdown",
                    "file_size_bytes": 10,
                    "file_path": "story/x/y",
                    "external_url": None,
                    "external_status": None,
                    "author_role": None,
                    "created_at": "2026-01-01 00:00:00",
                    "updated_at": "2026-01-01 00:00:00",
                },
            )

        alembic_command.downgrade(cfg, "0009_attachment")

        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT type FROM attachment WHERE id = :id"),
                {"id": attachment_id},
            ).fetchone()
        assert row is not None
        assert (
            row[0] == "My Report"
        ), f"type should be backfilled from title, got {row[0]!r}"

        columns = _table_columns(engine, "attachment")
        assert (
            "title" not in columns
        ), f"title column should be dropped on downgrade, got: {columns}"
        assert (
            "type" in columns
        ), f"type column should be restored on downgrade, got: {columns}"
        engine.dispose()

    def test_downgrade_truncates_long_title_to_100_chars_for_type(
        self, migration_db_url: str
    ) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, _PRE_CONTAINER_FK_REVISION)

        engine = create_engine(migration_db_url)
        attachment_id = str(uuid.uuid4())
        long_title = "x" * 400
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO attachment (
                        id, container_type, container_id, title, kind, mime_type,
                        file_size_bytes, file_path, external_url, external_status,
                        author_role, created_at, updated_at
                    ) VALUES (
                        :id, :container_type, :container_id, :title, :kind, :mime_type,
                        :file_size_bytes, :file_path, :external_url, :external_status,
                        :author_role, :created_at, :updated_at
                    )
                    """),
                {
                    "id": attachment_id,
                    "container_type": "story",
                    "container_id": str(uuid.uuid4()),
                    "title": long_title,
                    "kind": "document",
                    "mime_type": "text/markdown",
                    "file_size_bytes": 10,
                    "file_path": "story/x/y",
                    "external_url": None,
                    "external_status": None,
                    "author_role": None,
                    "created_at": "2026-01-01 00:00:00",
                    "updated_at": "2026-01-01 00:00:00",
                },
            )

        alembic_command.downgrade(cfg, "0009_attachment")

        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT type FROM attachment WHERE id = :id"),
                {"id": attachment_id},
            ).fetchone()
        assert (
            len(row[0]) == 100
        ), f"type should be truncated to 100 chars, got length {len(row[0])}"
        assert row[0] == long_title[:100]
        engine.dispose()

    def test_downgrade_reseeds_system_level_attachment_types_default(
        self, migration_db_url: str
    ) -> None:
        cfg = _alembic_config(migration_db_url)
        alembic_command.upgrade(cfg, _PRE_CONTAINER_FK_REVISION)

        engine = create_engine(migration_db_url)
        keys_before = _dictionary_keys(engine, "system_settings")
        assert (
            "attachment_types" not in keys_before
        ), "Precondition: retired after upgrade to head"

        alembic_command.downgrade(cfg, "0009_attachment")

        keys_after = _dictionary_keys(engine, "system_settings")
        assert (
            "attachment_types" in keys_after
        ), f"Downgrade should re-seed the system-level attachment_types default, got: {keys_after}"
        with engine.connect() as conn:
            import json

            row = conn.execute(
                text(
                    "SELECT \"values\" FROM system_settings WHERE key = 'attachment_types'"
                )
            ).fetchone()
        values = row[0] if isinstance(row[0], list) else json.loads(row[0])
        assert sorted(values) == sorted(
            _ATTACHMENT_TYPES_SEED_VALUES
        ), f"Re-seeded attachment_types should match the original defaults, got {values}"
        engine.dispose()
