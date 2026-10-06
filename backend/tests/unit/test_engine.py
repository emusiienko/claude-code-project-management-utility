"""Unit tests for app.core.database.engine — SQLite connection pragmas.

Application engines enforce foreign keys and run WAL; the migrations
environment explicitly turns enforcement off (SQLite table rebuilds would
otherwise cascade into child rows). Every test uses its own temporary SQLite
file, never the shared test database.
"""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

import alembic.config
import pytest
from alembic import command as alembic_command
from sqlalchemy import event, text
from sqlalchemy.engine import Engine

from app.core.database import build_engine, disable_sqlite_foreign_keys

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


@pytest.fixture
def db_url(tmp_path: Path) -> str:
    return f"sqlite:///{tmp_path / 'engine.db'}"


def _pragma(conn, name: str):
    return conn.execute(text(f"PRAGMA {name}")).scalar()


def test_build_engine_enables_foreign_keys_and_wal(db_url: str) -> None:
    engine = build_engine(db_url)
    try:
        with engine.connect() as conn:
            assert _pragma(conn, "foreign_keys") == 1
            assert _pragma(conn, "journal_mode") == "wal"
    finally:
        engine.dispose()


def test_every_pooled_connection_enforces_foreign_keys(db_url: str) -> None:
    engine = build_engine(db_url)
    try:
        first = engine.connect()
        second = engine.connect()
        try:
            assert first.connection.dbapi_connection is not (
                second.connection.dbapi_connection
            )
            assert _pragma(first, "foreign_keys") == 1
            assert _pragma(second, "foreign_keys") == 1
        finally:
            first.close()
            second.close()
    finally:
        engine.dispose()


def test_disable_sqlite_foreign_keys_turns_enforcement_off(db_url: str) -> None:
    engine = build_engine(db_url)
    disable_sqlite_foreign_keys(engine)
    try:
        with engine.connect() as conn:
            assert _pragma(conn, "foreign_keys") == 0
    finally:
        engine.dispose()


def test_disable_sqlite_foreign_keys_is_noop_on_other_dialects() -> None:
    class _FakeDialect:
        name = "postgresql"

    class _FakeEngine:
        dialect = _FakeDialect()

    # Would raise on event.listen against a non-Engine object if it registered.
    disable_sqlite_foreign_keys(_FakeEngine())  # type: ignore[arg-type]


@pytest.fixture
def force_foreign_keys_on() -> Generator[None, None, None]:
    """Make every new SQLite connection in the process start with FKs ON.

    A bare SQLite connection defaults to OFF, so without this the migrations
    test could not tell an explicit OFF from the default.
    """

    def _on(dbapi_connection, _record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    event.listen(Engine, "connect", _on)
    yield
    event.remove(Engine, "connect", _on)


def test_migration_run_connects_with_foreign_keys_off(
    db_url: str, force_foreign_keys_on: None
) -> None:
    observed: list[int] = []

    def _record(conn) -> None:
        observed.append(conn.exec_driver_sql("PRAGMA foreign_keys").scalar())

    event.listen(Engine, "begin", _record)
    try:
        cfg = alembic.config.Config(str(BACKEND_DIR / "alembic.ini"))
        cfg.set_main_option("sqlalchemy.url", db_url)
        alembic_command.upgrade(cfg, "head")
    finally:
        event.remove(Engine, "begin", _record)

    assert observed, "migration run opened no transaction"
    assert set(observed) == {0}
