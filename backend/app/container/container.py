from dependency_injector import containers, providers

from app.config import settings
from app.core.database import build_engine, build_session_factory, init_db_session
from app.core.storage import FilesystemStorage
from app.projects.repository import ProjectRepository
from app.projects.service import ProjectService
from app.settings.repository import ProjectSettingsRepository, SystemSettingsRepository
from app.settings.service import SettingsService


class AppContainer(containers.DeclarativeContainer):
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
    # DB session — ContextLocalResource (request-scoped)
    # --------------------------------------------------------------------------

    db_session = providers.ContextLocalResource(
        init_db_session,
        session_factory=session_factory,
    )

    # --------------------------------------------------------------------------
    # Projects domain — Factories (resolved per injection)
    # --------------------------------------------------------------------------

    project_repository = providers.Factory(
        ProjectRepository,
        session=db_session,
    )

    project_service = providers.Factory(
        ProjectService,
        repo=project_repository,
    )

    # --------------------------------------------------------------------------
    # Settings domain — Factories (resolved per injection)
    # --------------------------------------------------------------------------

    system_settings_repository = providers.Factory(
        SystemSettingsRepository,
        session=db_session,
    )

    project_settings_repository = providers.Factory(
        ProjectSettingsRepository,
        session=db_session,
    )

    settings_service = providers.Factory(
        SettingsService,
        system_repo=system_settings_repository,
        project_repo=project_settings_repository,
    )