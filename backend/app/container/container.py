from functools import partial

from dependency_injector import containers, providers

from app.attachments.repository import AttachmentRepository, list_referenced_file_paths
from app.attachments.service import AttachmentService
from app.comments.repository import CommentRepository
from app.comments.service import CommentService
from app.config import settings
from app.core.database import build_engine, build_session_factory, init_db_session
from app.core.storage import FileCleanupRequester, FilesystemStorage, OrphanFileSweeper
from app.milestones.repository import MilestoneRepository
from app.milestones.service import MilestoneService
from app.projects.repository import ProjectRepository
from app.projects.service import ProjectService
from app.sessions.repository import SessionRepository
from app.sessions.service import SessionService
from app.settings.repository import ProjectSettingsRepository, SystemSettingsRepository
from app.settings.service import SettingsService
from app.status.service import StatusService
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
    # Status domain — Factory
    # --------------------------------------------------------------------------
    # No repository: the status operation reads only the running app version
    # from config and probes no dependency (STORY-010 TASK-001).

    status_service = providers.Factory(
        StatusService,
        app_version=settings.app_version,
    )

    # --------------------------------------------------------------------------
    # Projects domain — Factories (resolved per injection)
    # --------------------------------------------------------------------------

    project_repository = providers.Factory(
        ProjectRepository,
        session=db_session,
    )

    # project_service itself is declared further below, after
    # file_cleanup_requester.

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
    # Sessions domain — Factories (resolved per injection)
    # --------------------------------------------------------------------------
    # Declared right after tasks (STORY-009): the sessions service only needs
    # project_repository, settings_service (effective_dict), story_repository,
    # and task_repository as its StoryReaderProtocol/TaskReaderProtocol
    # dependencies — all already declared above this point.

    session_repository = providers.Factory(
        SessionRepository,
        session=db_session,
    )

    session_service = providers.Factory(
        SessionService,
        repo=session_repository,
        project_repo=project_repository,
        effective_dict=settings_service,
        story_reader=story_repository,
        task_reader=task_repository,
    )

    # --------------------------------------------------------------------------
    # Attachments domain — Factories
    # --------------------------------------------------------------------------
    # Declared before milestone_service/story_service/task_service, which take
    # attachment_service as the AttachmentReader Protocol for detail composition;
    # needs story/task/milestone repositories, all declared above this point.

    attachment_repository = providers.Factory(
        AttachmentRepository,
        session=db_session,
    )

    # A no-argument callable the sweeper invokes per sweep; the session factory
    # is resolved at call time so a test override of it is honored.
    referenced_file_paths_reader = providers.Callable(
        partial, list_referenced_file_paths, session_factory.provider
    )

    orphan_file_sweeper = providers.Singleton(
        OrphanFileSweeper,
        storage=storage,
        referenced_paths=referenced_file_paths_reader,
    )

    file_cleanup_requester = providers.Factory(
        FileCleanupRequester,
        session=db_session,
        sweeper=orphan_file_sweeper,
        storage=storage,
    )

    attachment_service = providers.Factory(
        AttachmentService,
        repo=attachment_repository,
        storage=storage,
        story_reader=story_repository,
        task_reader=task_repository,
        milestone_reader=milestone_repository,
        file_cleanup=file_cleanup_requester,
    )

    # --------------------------------------------------------------------------
    # Comments domain — Factories
    # --------------------------------------------------------------------------
    # Declared before milestone_service/story_service/task_service, mirroring the
    # attachments domain above: comment_service is wired into all three as the
    # CommentReaderProtocol dependency for detail composition.

    comment_repository = providers.Factory(
        CommentRepository,
        session=db_session,
    )

    comment_service = providers.Factory(
        CommentService,
        repo=comment_repository,
        story_reader=story_repository,
        task_reader=task_repository,
        milestone_reader=milestone_repository,
    )

    # --------------------------------------------------------------------------
    # Projects domain — service (declared after file_cleanup_requester: project
    # delete requests the orphan sweep; the database cascade removes every
    # attachment and comment row beneath it). Story and task repositories are
    # the readers for the work-state aggregate read (STORY-010 TASK-002).
    # --------------------------------------------------------------------------

    project_service = providers.Factory(
        ProjectService,
        repo=project_repository,
        story_reader=story_repository,
        task_reader=task_repository,
        file_cleanup=file_cleanup_requester,
    )

    # --------------------------------------------------------------------------
    # Milestones domain — service (after attachment_service, see note above)
    # --------------------------------------------------------------------------

    milestone_service = providers.Factory(
        MilestoneService,
        repo=milestone_repository,
        project_repo=project_repository,
        story_repo=story_repository,
        # Cross-domain: milestones service composes attachments and comments
        # into its detail view via Protocol.
        attachment_reader=attachment_service,
        comment_reader=comment_service,
        file_cleanup=file_cleanup_requester,
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
        # Cross-domain: stories service reads story links via Protocol (STORY-006).
        story_link_reader=story_link_service,
        # Cross-domain: stories service composes attachments and comments into
        # its detail view via Protocol.
        attachment_reader=attachment_service,
        comment_reader=comment_service,
        file_cleanup=file_cleanup_requester,
    )

    task_service = providers.Factory(
        TaskService,
        repo=task_repository,
        story_repo=story_repository,
        effective_dict=settings_service,
        # Cross-domain: tasks service reads task links via Protocol (STORY-006).
        task_link_reader=task_link_service,
        # Cross-domain: tasks service composes attachments and comments into
        # its detail view via Protocol.
        attachment_reader=attachment_service,
        comment_reader=comment_service,
        file_cleanup=file_cleanup_requester,
    )
