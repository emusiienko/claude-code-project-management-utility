from contextlib import asynccontextmanager

from dependency_injector.wiring import Closing, Provide, inject
from sqlalchemy.orm import Session

from app.attachments.service import AttachmentService
from app.container.container import AppContainer
from app.milestones.service import MilestoneService
from app.projects.service import ProjectService
from app.settings.service import SettingsService
from app.stories.service import StoryService
from app.story_links.service import StoryLinkService
from app.task_links.service import TaskLinkService
from app.tasks.service import TaskService


@asynccontextmanager
@inject
async def provide_settings_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: SettingsService = Provide[AppContainer.settings_service],
):
    # Session lifecycle is managed by @inject + Closing[Provide[db_session]]:
    # DependencyResolver.__aenter__ initializes the ContextLocalResource (opens the session,
    # begins a transaction); DependencyResolver.__aexit__ calls shutdown() (commit + close).
    # @asynccontextmanager converts the async generator into an AbstractAsyncContextManager
    # so that fastmcp's uncalled_for engine can enter/exit it via AsyncExitStack.
    yield service


@asynccontextmanager
@inject
async def provide_project_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: ProjectService = Provide[AppContainer.project_service],
):
    yield service


@asynccontextmanager
@inject
async def provide_story_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: StoryService = Provide[AppContainer.story_service],
):
    yield service


@asynccontextmanager
@inject
async def provide_milestone_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: MilestoneService = Provide[AppContainer.milestone_service],
):
    yield service


@asynccontextmanager
@inject
async def provide_task_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: TaskService = Provide[AppContainer.task_service],
):
    yield service


@asynccontextmanager
@inject
async def provide_task_link_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: TaskLinkService = Provide[AppContainer.task_link_service],
):
    yield service


@asynccontextmanager
@inject
async def provide_story_link_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: StoryLinkService = Provide[AppContainer.story_link_service],
):
    yield service


@asynccontextmanager
@inject
async def provide_attachment_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: AttachmentService = Provide[AppContainer.attachment_service],
):
    yield service
