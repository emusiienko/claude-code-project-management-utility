"""Migration tests for the container foreign keys on attachment and comment —
STORY-016 / ADR-034, folded into 0009_attachment, 0010_attachment_title and
0011_comment.

Each test runs the real Alembic upgrade()/downgrade() against a private, disposable
SQLite file, not the shared session-scoped tests/test.db.

Coverage:
- Upgrade to head from an empty database gives the three container FK columns
  (each ON DELETE CASCADE), the exactly-one CHECK, and the per-container indexes;
  there is no container_type / container_id pair. For attachment this holds after
  0010 rebuilds the table.
- The CHECK rejects a row with no container key and a row with two or three.
- Downgrade to base drops both tables.
"""

from __future__ import annotations

import uuid
from pathlib import Path

import alembic.config
import pytest
import sqlalchemy as sa
from alembic import command as alembic_command
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

ALEMBIC_INI = Path(__file__).parent.parent / "alembic.ini"

TABLES = ("attachment", "comment")
NEW_INDEXES = {
    "attachment": {
        "ix_attachment_story_kind",
        "ix_attachment_task_kind",
        "ix_attachment_milestone_kind",
    },
    "comment": {
        "ix_comment_story_created",
        "ix_comment_task_created",
        "ix_comment_milestone_created",
    },
}
CONTAINER_KEYS = {"story_id", "task_id", "milestone_id"}
NOW = "2026-01-01 00:00:00"

_INSERT_NEW_SHAPE = {
    "attachment": (
        "INSERT INTO attachment (id, story_id, task_id, milestone_id, title, kind,"
        " created_at, updated_at) VALUES (:id, :story_id, :task_id, :milestone_id,"
        " 'T', 'document', :now, :now)"
    ),
    "comment": (
        "INSERT INTO comment (id, story_id, task_id, milestone_id, content,"
        " author_role, labels, ancestors, created_at, updated_at) VALUES (:id,"
        " :story_id, :task_id, :milestone_id, 'c', 'operator', '[]', '[]', :now,"
        " :now)"
    ),
}


def _config(db_url: str) -> alembic.config.Config:
    cfg = alembic.config.Config(str(ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


@pytest.fixture()
def db_url(tmp_path: Path) -> str:
    return f"sqlite:///{tmp_path / 'container_fk_migration.db'}"


@pytest.fixture()
def engine(db_url: str):
    engine = create_engine(db_url)
    yield engine
    engine.dispose()


def _columns(engine: sa.Engine, table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(engine).get_columns(table)}


def _indexes(engine: sa.Engine, table: str) -> set[str]:
    return {i["name"] for i in sa.inspect(engine).get_indexes(table)}


def _foreign_keys(engine: sa.Engine, table: str) -> dict[str, tuple[str, str | None]]:
    return {
        fk["constrained_columns"][0]: (
            fk["referred_table"],
            fk["options"].get("ondelete"),
        )
        for fk in sa.inspect(engine).get_foreign_keys(table)
    }


@pytest.mark.parametrize("table", TABLES)
def test_upgrade_gives_container_fk_shape(
    db_url: str, engine: sa.Engine, table: str
) -> None:
    alembic_command.upgrade(_config(db_url), "head")

    columns = _columns(engine, table)
    assert CONTAINER_KEYS <= columns
    assert not {"container_type", "container_id"} & columns
    assert _foreign_keys(engine, table) == {
        "story_id": ("story", "CASCADE"),
        "task_id": ("task", "CASCADE"),
        "milestone_id": ("milestone", "CASCADE"),
    }
    assert NEW_INDEXES[table] <= _indexes(engine, table)


@pytest.mark.parametrize("table", TABLES)
def test_downgrade_to_base_drops_the_table(
    db_url: str, engine: sa.Engine, table: str
) -> None:
    cfg = _config(db_url)
    alembic_command.upgrade(cfg, "head")
    alembic_command.downgrade(cfg, "base")

    assert table not in sa.inspect(engine).get_table_names()


@pytest.mark.parametrize("table", TABLES)
@pytest.mark.parametrize(
    "keys",
    [
        pytest.param(set(), id="no-key"),
        pytest.param({"story_id", "task_id"}, id="two-keys"),
        pytest.param({"story_id", "task_id", "milestone_id"}, id="three-keys"),
    ],
)
def test_check_rejects_zero_or_several_container_keys(
    db_url: str, engine: sa.Engine, table: str, keys: set[str]
) -> None:
    alembic_command.upgrade(_config(db_url), "head")
    params = {key: None for key in CONTAINER_KEYS} | {
        key: str(uuid.uuid4()) for key in keys
    }

    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.execute(
                text(_INSERT_NEW_SHAPE[table]),
                {"id": str(uuid.uuid4()), "now": NOW, **params},
            )


@pytest.mark.parametrize("table", TABLES)
def test_check_accepts_exactly_one_container_key(
    db_url: str, engine: sa.Engine, table: str
) -> None:
    alembic_command.upgrade(_config(db_url), "head")

    for key in sorted(CONTAINER_KEYS):
        params = {k: None for k in CONTAINER_KEYS} | {key: str(uuid.uuid4())}
        with engine.begin() as conn:
            conn.execute(
                text(_INSERT_NEW_SHAPE[table]),
                {"id": str(uuid.uuid4()), "now": NOW, **params},
            )
