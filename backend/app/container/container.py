from dependency_injector import containers, providers

from app.config import settings
from app.core.database import build_engine, build_session_factory, init_db_session
from app.core.storage import FilesystemStorage
from app.milestones.repository import MilestoneRepository
from app.milestones.service import MilestoneService
from app.projects.repository import ProjectRepository
from app.projects.service import ProjectService
from app.settings.repository import ProjectSettingsRepository, SystemSettingsRepository
from app.settings.service import SettingsService
from app.stories.repository import StoryRepository
from app.stories.service import StoryService
from app.story_links.repository import StoryLinkRepository
from app.story_links.service import StoryLinkService
from app.task_links.repository import TaskLinkRepository
from app.task_links.service import TaskLinkService
from app.tasks.repository import TaskRepository
from app.tasks.service import TaskService


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

    # --------------------------------------------------------------------------
    # Milestones domain — Factories (resolved per injection)
    # --------------------------------------------------------------------------

    milestone_repository = providers.Factory(
        MilestoneRepository,
        session=db_session,
    )

    # --------------------------------------------------------------------------
    # Stories domain — Factories (resolved per injection)
    # --------------------------------------------------------------------------

    story_repository = providers.Factory(
        StoryRepository,
        session=db_session,
    )

    milestone_service = providers.Factory(
        MilestoneService,
        repo=milestone_repository,
        project_repo=project_repository,
        story_repo=story_repository,
    )

    # --------------------------------------------------------------------------
    # Tasks domain — Factories (resolved per injection)
    # --------------------------------------------------------------------------
    # Declared before story_service because story_service takes task_repository
    # as the TaskCounterProtocol dependency for the on-demand aggregate.

    task_repository = providers.Factory(
        TaskRepository,
        session=db_session,
    )

    # --------------------------------------------------------------------------
    # Task Links domain — Factories
    # --------------------------------------------------------------------------
    # Declared before task_service so task_service can receive task_link_service
    # as its TaskLinkReaderProtocol dependency (STORY-006, TASK-003).

    task_link_repository = providers.Factory(
        TaskLinkRepository,
        session=db_session,
    )

    task_link_service = providers.Factory(
        TaskLinkService,
        repo=task_link_repository,
        task_repo=task_repository,
        story_repo=story_repository,
        effective_dict=settings_service,
    )

    # --------------------------------------------------------------------------
    # Story Links domain — Factories
    # --------------------------------------------------------------------------
    # Declared before story_service so story_service can receive story_link_service
    # as its StoryLinkReaderProtocol dependency (STORY-006, TASK-003).

    story_link_repository = providers.Factory(
        StoryLinkRepository,
        session=db_session,
    )

    story_link_service = providers.Factory(
        StoryLinkService,
        repo=story_link_repository,
        story_repo=story_repository,
        effective_dict=settings_service,
    )

    # --------------------------------------------------------------------------
    # Story + Task service — after link services so Protocol readers can be wired
    # --------------------------------------------------------------------------

    story_service = providers.Factory(
        StoryService,
        repo=story_repository,
        project_repo=project_repository,
        effective_dict=settings_service,
        # Cross-domain: stories service validates milestone existence + project.
        milestone_repo=milestone_repository,
        # Cross-domain: stories service computes on-demand task aggregate via Protocol.
        task_counter=task_repository,
        # Cross-domain: stories service reads and clears story links via Protocol (STORY-006).
        story_link_reader=story_link_service,
    )

    task_service = providers.Factory(
        TaskService,
        repo=task_repository,
        story_repo=story_repository,
        effective_dict=settings_service,
        # Cross-domain: tasks service reads and clears task links via Protocol (STORY-006).
        task_link_reader=task_link_service,
    )
