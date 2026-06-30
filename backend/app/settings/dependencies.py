from collections.abc import Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from app.container import container
from app.container.project_checker import SqlProjectChecker
from app.settings.repository import ProjectSettingsRepository, SystemSettingsRepository
from app.settings.service import SettingsService


def _get_db() -> Generator[Session, None, None]:
    # Yields a single DB session from the shared container session factory.
    # Commits on success; rolls back on any exception raised by the handler.
    # All repositories within a request share this one session so that
    # multi-key updates are fully atomic.
    session_factory = container.session_factory()
    db = session_factory()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_settings_service(
    db: Session = Depends(_get_db),
) -> SettingsService:
    # Builds SettingsService with all three dependencies sharing the same
    # DB session so every write within one request is atomic.
    # The container's Factory providers are NOT used here because each
    # Factory call creates its own independent session; this function is
    # the correct composition point for HTTP request scope.
    system_repo = SystemSettingsRepository(session=db)
    project_repo = ProjectSettingsRepository(session=db)
    project_checker = SqlProjectChecker(session=db)
    return SettingsService(
        system_repo=system_repo,
        project_repo=project_repo,
        project_checker=project_checker,
    )
