import datetime
import uuid
from typing import TYPE_CHECKING, Protocol, runtime_checkable

from app.attachments import schema as attachment_schema

# Import only the Protocol, never the concrete AttachmentService.
from app.attachments.service import AttachmentReaderProtocol
from app.comments import schema as comment_schema

# Import only the Protocol, never the concrete CommentService.
from app.comments.service import CommentReaderProtocol
from app.core.errors import ConflictError, NotFoundError
from app.projects.model import Project
from app.projects.repository import ProjectRepository
from app.projects.schema import ProjectWorkState, WorkStateStory, WorkStateTask

if TYPE_CHECKING:
    from app.milestones.model import Milestone as MilestoneModel
    from app.stories.model import Story as StoryModel
    from app.tasks.model import Task as TaskModel

_NAME_CONFLICT_MSG = "A project with this name already exists."

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


class ProjectService:
    def __init__(
        self,
        repo: ProjectRepository,
        story_reader: "StoryReaderProtocol | None" = None,
        task_reader: "TaskReaderProtocol | None" = None,
        milestone_reader: "MilestoneReaderProtocol | None" = None,
        attachment_reader: AttachmentReaderProtocol | None = None,
        comment_reader: CommentReaderProtocol | None = None,
    ) -> None:
        self._repo = repo
        self._story_reader = story_reader
        self._task_reader = task_reader
        self._milestone_reader = milestone_reader
        self._attachment_reader = attachment_reader
        self._comment_reader = comment_reader

    def create(
        self,
        name: str,
        description: str | None,
    ) -> Project:
        # Field-level validation (length, non-empty) is enforced by the Pydantic
        # schema before reaching this layer; only business-rule validation lives here.
        self._assert_name_unique(name, exclude_id=None)

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        project = Project(
            id=uuid.uuid4(),
            name=name,
            description=description,
            created_at=now,
            updated_at=now,
        )
        return self._repo.save(project)

    def get(self, project_id: str) -> Project:
        project = self._repo.get_by_id(project_id)
        if project is None:
            raise NotFoundError(f"Project '{project_id}' not found.")
        return project

    def list_paginated(
        self,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
    ) -> tuple[list[Project], int]:
        # Clamp limit to the contract maximum; never raise on an out-of-range value
        # because the controller validates first — this is a safety floor only.
        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit
        return self._repo.list_paginated(effective_limit, offset)

    def update(
        self,
        project_id: str,
        name: str | None,
        description: str | None,
    ) -> Project:
        project = self.get(project_id)

        if name is not None:
            self._assert_name_unique(name, exclude_id=project.id)
            project.name = name

        if description is not None:
            project.description = description

        project.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(project)

    def delete(self, project_id: str) -> None:
        project = self.get(project_id)
        # Attachments and comments have no FK to their container, so the database
        # cascade leaves them behind. The ids of every story, task and milestone
        # the cascade will remove must be read now, before the project row goes.
        story_ids = self._collect_story_ids(project.id)
        task_ids = self._collect_task_ids(story_ids)
        milestone_ids = self._collect_milestone_ids(project.id)
        self._delete_container_children(
            attachment_schema.CONTAINER_STORY,
            comment_schema.CONTAINER_STORY,
            story_ids,
        )
        self._delete_container_children(
            attachment_schema.CONTAINER_TASK,
            comment_schema.CONTAINER_TASK,
            task_ids,
        )
        self._delete_container_children(
            attachment_schema.CONTAINER_MILESTONE,
            comment_schema.CONTAINER_MILESTONE,
            milestone_ids,
        )
        self._repo.delete(project)

    def get_work_state(self, project_id: str) -> ProjectWorkState:
        project = self.get(project_id)
        work_state = ProjectWorkState.model_validate(project)

        if self._story_reader is None or self._task_reader is None:
            return work_state

        story_models = self._story_reader.list_all_for_project(project.id)
        story_ids = [story.id for story in story_models]

        # Two batched queries across every story in the project — never one
        # per story/task — keep this composition free of an N+1 pattern.
        tasks_by_story: dict[uuid.UUID, list["TaskModel"]] = {}
        status_counts_by_story: dict[uuid.UUID, dict[str, int]] = {}
        if story_ids:
            for task in self._task_reader.list_all_for_stories(story_ids):
                tasks_by_story.setdefault(task.story_id, []).append(task)
            status_counts_by_story = self._task_reader.get_status_counts_for_stories(
                story_ids
            )

        stories: list[WorkStateStory] = []
        for story in story_models:
            ws_story = WorkStateStory.model_validate(story)
            ws_story.tasks = [
                WorkStateTask.model_validate(task)
                for task in tasks_by_story.get(story.id, [])
            ]
            ws_story.task_status_counts = status_counts_by_story.get(story.id, {})
            stories.append(ws_story)

        work_state.stories = stories
        return work_state

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _collect_story_ids(self, project_id: uuid.UUID) -> list[uuid.UUID]:
        if self._story_reader is None:
            return []
        return [s.id for s in self._story_reader.list_all_for_project(project_id)]

    def _collect_task_ids(self, story_ids: list[uuid.UUID]) -> list[uuid.UUID]:
        if self._task_reader is None or not story_ids:
            return []
        return [t.id for t in self._task_reader.list_all_for_stories(story_ids)]

    def _collect_milestone_ids(self, project_id: uuid.UUID) -> list[uuid.UUID]:
        if self._milestone_reader is None:
            return []
        return [m.id for m in self._milestone_reader.list_all_for_project(project_id)]

    def _delete_container_children(
        self,
        attachment_container_type: str,
        comment_container_type: str,
        container_ids: list[uuid.UUID],
    ) -> None:
        if self._attachment_reader is not None:
            self._attachment_reader.delete_all_for_containers(
                attachment_container_type, container_ids
            )
        if self._comment_reader is not None:
            self._comment_reader.delete_all_for_containers(
                comment_container_type, container_ids
            )

    def _assert_name_unique(
        self,
        name: str,
        exclude_id: uuid.UUID | None,
    ) -> None:
        conflict = self._repo.get_name_conflict(name, exclude_id=exclude_id)
        if conflict is not None:
            raise ConflictError(_NAME_CONFLICT_MSG)


@runtime_checkable
class StoryReaderProtocol(Protocol):
    def list_all_for_project(
        self, project_id: str | uuid.UUID
    ) -> list["StoryModel"]: ...


@runtime_checkable
class TaskReaderProtocol(Protocol):
    def list_all_for_stories(self, story_ids: list[uuid.UUID]) -> list["TaskModel"]: ...

    def get_status_counts_for_stories(
        self, story_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, dict[str, int]]: ...


@runtime_checkable
class MilestoneReaderProtocol(Protocol):
    def list_all_for_project(
        self, project_id: str | uuid.UUID
    ) -> list["MilestoneModel"]: ...
