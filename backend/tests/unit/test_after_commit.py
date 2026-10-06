"""Unit tests for app.core.database.session — after-commit actions."""

from __future__ import annotations

import logging
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import build_engine, build_session_factory, run_after_commit

LOGGER = logging.getLogger("app.core.database.session")


@pytest.fixture(autouse=True)
def _enable_logger(monkeypatch: pytest.MonkeyPatch) -> None:
    # migrations/env.py runs logging.fileConfig, which disables loggers created
    # before it ran; re-enable this one so caplog can see it.
    monkeypatch.setattr(LOGGER, "disabled", False)


@pytest.fixture
def session(tmp_path: Path):
    engine = build_engine(f"sqlite:///{tmp_path / 'after_commit.db'}")
    factory: sessionmaker[Session] = build_session_factory(engine)
    db = factory()
    db.execute(text("CREATE TABLE t (id INTEGER PRIMARY KEY)"))
    db.commit()
    yield db
    db.close()
    engine.dispose()


def test_action_runs_once_after_commit(session: Session) -> None:
    calls: list[str] = []
    session.execute(text("INSERT INTO t (id) VALUES (1)"))
    run_after_commit(session, lambda: calls.append("ran"))

    assert calls == [], "Action must not run before the commit"
    session.commit()
    assert calls == ["ran"]

    session.execute(text("INSERT INTO t (id) VALUES (2)"))
    session.commit()
    assert calls == ["ran"], "Action must run once, not on every later commit"


def test_action_is_dropped_on_rollback(session: Session) -> None:
    calls: list[str] = []
    session.execute(text("INSERT INTO t (id) VALUES (1)"))
    run_after_commit(session, lambda: calls.append("ran"))

    session.rollback()
    session.execute(text("INSERT INTO t (id) VALUES (2)"))
    session.commit()

    assert calls == [], "A rolled-back transaction must discard its actions"


def test_raising_action_does_not_fail_commit_or_block_others(
    session: Session, caplog: pytest.LogCaptureFixture
) -> None:
    calls: list[str] = []

    def failing() -> None:
        raise RuntimeError("boom")

    session.execute(text("INSERT INTO t (id) VALUES (1)"))
    run_after_commit(session, failing)
    run_after_commit(session, lambda: calls.append("second"))

    session.commit()

    assert calls == ["second"]
    assert "After-commit action failed" in caplog.text
    assert session.execute(text("SELECT count(*) FROM t")).scalar() == 1
