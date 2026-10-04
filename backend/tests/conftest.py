"""Shared test fixtures for integration tests.

All tests run against a real SQLite database created fresh each session.
The test database is written to tests/test.db and removed at teardown.
"""

import os
import shutil
import uuid
from collections.abc import AsyncGenerator, Generator
from datetime import datetime, timezone
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TEST_DB_PATH = Path(__file__).parent / "test.db"
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"

# ATTACHMENTS_DIR must be set before anything imports app.config (Settings()
# reads it at instantiation). conftest.py is always imported by pytest before
# any test module, and nothing above this line imports an app.* package, so
# setting it here — at collection time — guarantees it lands before the first
# `from app...` import anywhere else (e.g. inside the `client` fixture, or
# migrations/env.py imported transitively by the `apply_migrations` fixture).
ATTACHMENTS_TEST_DIR = Path(__file__).parent / "attachments_tmp"
os.environ.setdefault("ATTACHMENTS_DIR", str(ATTACHMENTS_TEST_DIR))

# ---------------------------------------------------------------------------
# Session-scoped engine + schema setup
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def engine():
    """Create a fresh SQLite engine for the test session."""
    # Remove stale db from a previous run, if any.
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    _engine = create_engine(TEST_DB_URL, echo=False)

    # SQLite ignores declared FK actions (ON DELETE CASCADE / SET NULL) unless
    # this is issued on every connection. Test-engine only: migrations build
    # their own engine in migrations/env.py, so table rebuilds are unaffected.
    @event.listens_for(_engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Enable WAL mode (mirrors production SQLite config).
    with _engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))

    yield _engine

    _engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture(scope="session", autouse=True)
def attachments_dir() -> Generator[Path, None, None]:
    """Create the temp ATTACHMENTS_DIR for the test session; remove it after.

    Fills the gap noted by TASK-002's implementor: `docs/backend-coding-conventions.md`
    describes this fixture as already existing; it did not. Autouse + session-scoped so
    every test (attachments or otherwise) gets a clean, existing directory without
    needing to depend on it explicitly.
    """
    if ATTACHMENTS_TEST_DIR.exists():
        shutil.rmtree(ATTACHMENTS_TEST_DIR)
    ATTACHMENTS_TEST_DIR.mkdir(parents=True, exist_ok=True)

    yield ATTACHMENTS_TEST_DIR

    shutil.rmtree(ATTACHMENTS_TEST_DIR, ignore_errors=True)


@pytest.fixture(scope="session")
def apply_migrations(engine):
    """Run Alembic migrations to head against the test engine.

    0001_project creates the project table first, so 0002_settings can
    declare the project_settings FK inline without any workaround.
    """
    import alembic.config
    from alembic import command as alembic_command

    alembic_ini = Path(__file__).parent.parent / "alembic.ini"
    cfg = alembic.config.Config(str(alembic_ini))
    cfg.set_main_option("sqlalchemy.url", TEST_DB_URL)
    alembic_command.upgrade(cfg, "head")

    yield


@pytest.fixture(scope="session")
def session_factory(engine, apply_migrations):
    """Return a sessionmaker bound to the test engine."""
    factory = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
    return factory


# ---------------------------------------------------------------------------
# Per-test DB session with rollback isolation
# ---------------------------------------------------------------------------


@pytest.fixture()
def db_session(session_factory) -> Generator[Session, None, None]:
    """Provide a DB session that rolls back after each test.

    This keeps tests independent without recreating the schema each time.
    """
    session = session_factory()
    try:
        yield session
        session.rollback()
    finally:
        session.close()


# ---------------------------------------------------------------------------
# HTTPX async client wired to the FastAPI app with test DB override
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture()
async def client(session_factory) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTPX client pointed at the FastAPI app with the test DB injected.

    We override session_factory (not db_session) so that db_session remains the
    original ContextLocalResource. DependencyResolver calls shutdown() on the original
    provider directly — which IS initialized — so the commit runs correctly.
    Overriding db_session itself breaks teardown because DependencyResolver calls
    shutdown() on the original (un-initialized) provider and the override is never shut
    down.
    """
    from dependency_injector import providers as di_providers

    from app.container import container
    from app.main import application

    with container.session_factory.override(di_providers.Object(session_factory)):
        async with AsyncClient(
            transport=ASGITransport(app=application), base_url="http://test"
        ) as ac:
            yield ac


# ---------------------------------------------------------------------------
# Helper: insert a project row directly (needed for project-scoped tests)
# ---------------------------------------------------------------------------


@pytest.fixture()
def create_project(db_session: Session):
    """Factory fixture: insert a project row and return its ID string."""
    created_ids: list[str] = []

    def _create(name: str = "Test Project") -> str:
        project_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        db_session.execute(
            text(
                "INSERT INTO project (id, name, created_at, updated_at)"
                " VALUES (:id, :name, :created_at, :updated_at)"
            ),
            {"id": project_id, "name": name, "created_at": now, "updated_at": now},
        )
        db_session.commit()
        created_ids.append(project_id)
        return project_id

    yield _create

    # Cleanup: delete inserted projects and their settings (CASCADE handles
    # project_settings rows automatically).
    for pid in created_ids:
        db_session.execute(text("DELETE FROM project WHERE id = :id"), {"id": pid})
    db_session.commit()
