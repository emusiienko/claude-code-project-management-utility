import datetime
import uuid
from typing import Protocol, runtime_checkable

from app.attachments.schema import CONTAINER_TASK
# Import only the Protocol, never the concrete AttachmentService.
from app.attachments.service import AttachmentReaderProtocol
from app.core.errors import NotFoundError, UnprocessableError
from app.settings.schema import (
    DICT_KEY_PARTICIPANT_ROLES,
    DICT_KEY_TASK_STATUSES,
    DICT_KEY_TASK_TYPES,
)
from app.settings.service import EffectiveDictionary
from app.stories.model import Story
from app.stories.repository import StoryRepository
from app.tasks.model import Task
from app.tasks.repository import TaskRepository
from app.tasks.schema import CreateTask, UpdateTask

_TYPE_VIOLATION_MSG = (
    "Value '{v}' is not allowed for field 'type'. Allowed: {allowed}."
)
_STATUS_VIOLATION_MSG = (
    "Value '{v}' is not allowed for field 'status'. Allowed: {allowed}."
)
_ASSIGNEE_ROLE_VIOLATION_MSG = (
    "Value '{v}' is not allowed for field 'assignee_role'. Allowed: {allowed}."
)
_CREATOR_ROLE_VIOLATION_MSG = (
    "Value '{v}' is not allowed for field 'creator_role'. Allowed: {allowed}."
)
_STORY_ID_IMMUTABLE_MSG = "story_id cannot be changed after creation."

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


@runtime_checkable
class TaskLinkReaderProtocol(Protocol):
    def list_all_enriched_for_task(self, task_id: uuid.UUID) -> list: ...

    def delete_all_for_task(self, task_id: uuid.UUID) -> None: ...


class TaskService:
    def __init__(
        self,
        repo: TaskRepository,
        story_repo: StoryRepository,
        effective_dict: EffectiveDictionary,
        task_link_reader: 'TaskLinkReaderProtocol | None' = None,
        attachment_reader: AttachmentReaderProtocol | None = None,
    ) -> None:
        self._repo = repo
        self._story_repo = story_repo
        self._effective_dict = effective_dict
        self._task_link_reader = task_link_reader
        self._attachment_reader = attachment_reader

    def create(self, story_id: str, data: CreateTask) -> Task:
        story = self._assert_story_exists(story_id)
        project_id = str(story.project_id)

        self._assert_type_valid(project_id, data.type)
        self._assert_status_valid(project_id, data.status)

        if data.assignee_role is not None:
            self._assert_role_valid(
                project_id, data.assignee_role, _ASSIGNEE_ROLE_VIOLATION_MSG
            )

        if data.creator_role is not None:
            self._assert_role_valid(
                project_id, data.creator_role, _CREATOR_ROLE_VIOLATION_MSG
            )

        story_uuid = self._repo.coerce_story_id(story_id)
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        labels = [label.model_dump() for label in data.labels]

        task = Task(
            id=uuid.uuid4(),
            story_id=story_uuid,
            title=data.title,
            content=data.content,
            type=data.type,
            status=data.status,
            assignee_role=data.assignee_role,
            creator_role=data.creator_role,
            labels=labels,
            created_at=now,
            updated_at=now,
        )
        return self._repo.save(task)

    def get_by_id(self, task_id: str) -> Task:
        task = self._repo.get_by_id(task_id)
        if task is None:
            raise NotFoundError(f"Task '{task_id}' not found.")
        return task

    def get_detail(self, task_id: str) -> tuple[Task, list, list]:
        task = self.get_by_id(task_id)
        links: list = []
        if self._task_link_reader is not None:
            links = self._task_link_reader.list_all_enriched_for_task(task.id)
        attachments: list = []
        if self._attachment_reader is not None:
            attachments = self._attachment_reader.list_all_for_container(
                CONTAINER_TASK, task.id
            )
        return task, links, attachments

    def list_paginated(
        self,
        story_id: str,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
        status_filter: str | None = None,
        type_filter: str | None = None,
        assignee_role_filter: str | None = None,
        creator_role_filter: str | None = None,
    ) -> tuple[list[Task], int]:
        self._assert_story_exists(story_id)

        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit

        return self._repo.list_paginated(
            story_id=story_id,
            limit=effective_limit,
            offset=offset,
            status_filter=status_filter,
            type_filter=type_filter,
            assignee_role_filter=assignee_role_filter,
            creator_role_filter=creator_role_filter,
        )

    def update(self, task_id: str, data: UpdateTask) -> Task:
        task = self.get_by_id(task_id)
        project_id = self._resolve_project_id(task)

        if data.type is not None:
            self._assert_type_valid(project_id, data.type)

        if data.status is not None:
            self._assert_status_valid(project_id, data.status)

        if data.assignee_role is not None:
            self._assert_role_valid(
                project_id, data.assignee_role, _ASSIGNEE_ROLE_VIOLATION_MSG
            )

        if data.creator_role is not None:
            self._assert_role_valid(
                project_id, data.creator_role, _CREATOR_ROLE_VIOLATION_MSG
            )

        if data.title is not None:
            task.title = data.title

        if "content" in data.model_fields_set:
            task.content = data.content

        if data.type is not None:
            task.type = data.type

        if data.status is not None:
            task.status = data.status

        if "assignee_role" in data.model_fields_set:
            task.assignee_role = data.assignee_role

        if "creator_role" in data.model_fields_set:
            task.creator_role = data.creator_role

        if data.labels is not None:
            task.labels = [label.model_dump() for label in data.labels]

        task.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(task)

    def delete(self, task_id: str) -> None:
        task = self.get_by_id(task_id)
        # Application-level cascade: remove all task links referencing this task
        # before deleting it. SQLite's ON DELETE CASCADE is inert without
        # PRAGMA foreign_keys = ON (Known Divergences — architecture.md).
        if self._task_link_reader is not None:
            self._task_link_reader.delete_all_for_task(task.id)
        # Application-level cascade (ADR-018 precedent, extended to the
        # no-FK polymorphic attachment container): remove the task's
        # attachments — rows and files — before the task itself is removed.
        if self._attachment_reader is not None:
            self._attachment_reader.delete_all_for_container(
                CONTAINER_TASK, task.id
            )
        self._repo.delete(task)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _assert_story_exists(self, story_id: str) -> Story:
        story = self._story_repo.get_by_id(story_id)
        if story is None:
            raise NotFoundError(f"Story '{story_id}' not found.")
        return story

    def _resolve_project_id(self, task: Task) -> str:
        # Resolves the owning project transitively: task → story → project.
        # The story is the canonical source of project_id for all dictionary validation.
        story = self._story_repo.get_by_id(str(task.story_id))
        if story is None:
            # This should not happen under normal operation (parent-story assertion
            # runs on every write), but guard defensively.
            raise NotFoundError(f"Story '{task.story_id}' not found.")
        return str(story.project_id)

    def _assert_type_valid(self, project_id: str, task_type: str) -> None:
        allowed = self._effective_dict.resolve(project_id, DICT_KEY_TASK_TYPES)
        if task_type not in allowed:
            allowed_str = ", ".join(allowed)
            raise UnprocessableError(
                _TYPE_VIOLATION_MSG.format(v=task_type, allowed=allowed_str)
            )

    def _assert_status_valid(self, project_id: str, task_status: str) -> None:
        allowed = self._effective_dict.resolve(project_id, DICT_KEY_TASK_STATUSES)
        if task_status not in allowed:
            allowed_str = ", ".join(allowed)
            raise UnprocessableError(
                _STATUS_VIOLATION_MSG.format(v=task_status, allowed=allowed_str)
            )

    def _assert_role_valid(
        self, project_id: str, role: str, msg_template: str
    ) -> None:
        allowed = self._effective_dict.resolve(project_id, DICT_KEY_PARTICIPANT_ROLES)
        if role not in allowed:
            allowed_str = ", ".join(allowed)
            raise UnprocessableError(
                msg_template.format(v=role, allowed=allowed_str)
            )
