"""Shared test fixtures for integration tests.

All tests run against a real SQLite database created fresh each session.
The test database is written to tests/test.db and removed at teardown.
"""
import uuid
from collections.abc import AsyncGenerator, Generator
from datetime import datetime, timezone
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TEST_DB_PATH = Path(__file__).parent / "test.db"
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"

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

    # Enable WAL mode (mirrors production SQLite config).
    with _engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))

    yield _engine

    _engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


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

    The FastAPI dependency `get_settings_service` (in app.settings.dependencies)
    is overridden to use a test-scoped session from our test sessionmaker instead
    of the real production container.
    """
    # Import here to avoid module-level side effects during collection.
    from app.api.factory import create_app
    from app.container.project_checker import SqlProjectChecker
    from app.settings.dependencies import get_settings_service
    from app.settings.repository import (
        ProjectSettingsRepository,
        SystemSettingsRepository,
    )
    from app.settings.service import SettingsService

    app = create_app()

    def override_get_settings_service():
        db = session_factory()
        try:
            system_repo = SystemSettingsRepository(session=db)
            project_repo = ProjectSettingsRepository(session=db)
            project_checker = SqlProjectChecker(session=db)
            service = SettingsService(
                system_repo=system_repo,
                project_repo=project_repo,
                project_checker=project_checker,
            )
            yield service
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_settings_service] = override_get_settings_service

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


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
