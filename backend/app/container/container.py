from dependency_injector import containers, providers

from app.container.project_checker import SqlProjectChecker
from app.core.config import settings
from app.core.database import build_engine, build_session_factory, create_session
from app.core.storage import FilesystemStorage
from app.settings.repository import ProjectSettingsRepository, SystemSettingsRepository
from app.settings.service import SettingsService


class AppContainer(containers.DeclarativeContainer):
    # Single global DI composition root.
    # All providers are defined here; app packages never own their own providers.

    # --------------------------------------------------------------------------
    # Infrastructure — Singletons (application-scoped)
    # --------------------------------------------------------------------------

    engine = providers.Singleton(
        build_engine,
        database_url=settings.database_url,
    )

    session_factory = providers.Singleton(
        build_session_factory,
        engine=engine,
    )

    storage = providers.Singleton(
        FilesystemStorage,
        base_dir=settings.attachments_dir,
    )

    # --------------------------------------------------------------------------
    # DB session — Factory (request-scoped)
    # A new Session is created per request via create_session(session_factory).
    # --------------------------------------------------------------------------

    db_session = providers.Factory(
        create_session,
        session_factory=session_factory,
    )

    # --------------------------------------------------------------------------
    # Settings domain — Factories (request-scoped)
    # --------------------------------------------------------------------------

    system_settings_repository = providers.Factory(
        SystemSettingsRepository,
        session=db_session,
    )

    project_settings_repository = providers.Factory(
        ProjectSettingsRepository,
        session=db_session,
    )

    project_checker = providers.Factory(
        SqlProjectChecker,
        session=db_session,
    )

    settings_service = providers.Factory(
        SettingsService,
        system_repo=system_settings_repository,
        project_repo=project_settings_repository,
        project_checker=project_checker,
    )
