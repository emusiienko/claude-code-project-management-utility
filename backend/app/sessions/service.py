import datetime
import uuid
from typing import TYPE_CHECKING, Protocol, runtime_checkable

from app.core.errors import NotFoundError, UnprocessableError, ValidationError
from app.projects.repository import ProjectRepository
from app.sessions.model import Session
from app.sessions.repository import SessionRepository
from app.sessions.schema import CreateSession, UpdateSession
from app.settings.schema import DICT_KEY_PARTICIPANT_ROLES
# Import only the Protocol, never the concrete SettingsService.
from app.settings.service import EffectiveDictionary

if TYPE_CHECKING:
    from app.stories.model import Story as StoryModel
    from app.tasks.model import Task as TaskModel

_PARTICIPANT_ROLE_VIOLATION_MSG = "Value '{v}' is not allowed. Allowed: {allowed}."
_LINKED_STORY_NOT_FOUND_MSG = "Story '{v}' not found."
_LINKED_TASK_NOT_FOUND_MSG = "Task '{v}' not found."
_LINKED_STORY_WRONG_PROJECT_MSG = (
    "linked_story_id does not belong to the session's project."
)
_LINKED_TASK_WRONG_PROJECT_MSG = (
    "linked_task_id does not belong to the session's project."
)
_ALREADY_ARCHIVED_MSG = "Session is already archived."

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


@runtime_checkable
class StoryReaderProtocol(Protocol):
    """Resolves a story and, via its project_id, the story's owning project.
    Satisfied structurally by StoryRepository through the container."""

    def get_by_id(self, story_id: str | uuid.UUID) -> "StoryModel | None": ...


@runtime_checkable
class TaskReaderProtocol(Protocol):
    """Resolves a task; the task's owning project is derived transitively by
    the sessions service via its story_id + StoryReaderProtocol. Satisfied
    structurally by TaskRepository through the container."""

    def get_by_id(self, task_id: str | uuid.UUID) -> "TaskModel | None": ...


@runtime_checkable
class SessionReferenceCleanerProtocol(Protocol):
    """Satisfied structurally by SessionService; injected into the story and
    task services (never the concrete class) so those domains can null out
    session references on container delete without depending on the
    sessions package. Mirrors the attachments/comments AttachmentReader /
    CommentReader inbound-reader arrangement, in the reverse direction."""

    def clear_references_to_story(self, story_id: uuid.UUID) -> None: ...

    def clear_references_to_task(self, task_id: uuid.UUID) -> None: ...


class SessionService:
    def __init__(
        self,
        repo: SessionRepository,
        project_repo: ProjectRepository,
        effective_dict: EffectiveDictionary,
        story_reader: StoryReaderProtocol,
        task_reader: TaskReaderProtocol,
    ) -> None:
        self._repo = repo
        self._project_repo = project_repo
        self._effective_dict = effective_dict
        self._story_reader = story_reader
        self._task_reader = task_reader

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create(self, data: CreateSession) -> Session:
        project_uuid = self._assert_project_exists(data.project_id)
        self._assert_participant_role_valid(str(project_uuid), data.participant_role)

        linked_story_uuid: uuid.UUID | None = None
        if data.linked_story_id is not None:
            linked_story_uuid = self._assert_story_in_project(
                data.linked_story_id, project_uuid
            )

        linked_task_uuid: uuid.UUID | None = None
        if data.linked_task_id is not None:
            linked_task_uuid = self._assert_task_in_project(
                data.linked_task_id, project_uuid
            )

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        session = Session(
            id=uuid.uuid4(),
            project_id=project_uuid,
            topic=data.topic,
            goal=data.goal,
            context=data.context,
            status=data.status,
            participant_role=data.participant_role,
            result_decisions=None,
            result_summary=None,
            is_complete=False,
            linked_story_id=linked_story_uuid,
            linked_task_id=linked_task_uuid,
            archived_at=None,
            created_at=now,
            updated_at=now,
        )
        return self._repo.save(session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_by_id(self, session_id: str) -> Session:
        session = self._repo.get_by_id(session_id)
        if session is None:
            raise NotFoundError(f"Session '{session_id}' not found.")
        return session

    def list_paginated(
        self,
        project_id: str,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
        incomplete_only: bool = False,
        linked_story_id: str | None = None,
        include_archived: bool = False,
    ) -> tuple[list[Session], int]:
        project_uuid = self._assert_project_exists(project_id)

        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit

        linked_story_uuid: uuid.UUID | None = None
        if linked_story_id is not None:
            try:
                linked_story_uuid = uuid.UUID(linked_story_id)
            except ValueError:
                # Malformed UUID cannot match any row — treat as empty filter.
                return [], 0

        return self._repo.list_paginated(
            project_id=project_uuid,
            limit=effective_limit,
            offset=offset,
            incomplete_only=incomplete_only,
            linked_story_id=linked_story_uuid,
            include_archived=include_archived,
        )

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(self, session_id: str, data: UpdateSession) -> Session:
        session = self.get_by_id(session_id)
        project_uuid = session.project_id

        if data.participant_role is not None:
            self._assert_participant_role_valid(
                str(project_uuid), data.participant_role
            )

        if data.topic is not None:
            session.topic = data.topic

        if data.goal is not None:
            session.goal = data.goal

        if data.participant_role is not None:
            session.participant_role = data.participant_role

        if "context" in data.model_fields_set:
            session.context = data.context

        if "status" in data.model_fields_set:
            session.status = data.status

        if "result_decisions" in data.model_fields_set:
            session.result_decisions = data.result_decisions

        if "result_summary" in data.model_fields_set:
            session.result_summary = data.result_summary

        if data.is_complete is not None:
            session.is_complete = data.is_complete

        if "linked_story_id" in data.model_fields_set:
            if data.linked_story_id is None:
                session.linked_story_id = None
            else:
                session.linked_story_id = self._assert_story_in_project(
                    data.linked_story_id, project_uuid
                )

        if "linked_task_id" in data.model_fields_set:
            if data.linked_task_id is None:
                session.linked_task_id = None
            else:
                session.linked_task_id = self._assert_task_in_project(
                    data.linked_task_id, project_uuid
                )

        session.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(session)

    # ------------------------------------------------------------------
    # Archive
    # ------------------------------------------------------------------

    def archive(self, session_id: str) -> Session:
        session = self.get_by_id(session_id)
        if session.archived_at is not None:
            raise ValidationError(_ALREADY_ARCHIVED_MSG)

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        session.archived_at = now
        session.updated_at = now
        return self._repo.save(session)

    # ------------------------------------------------------------------
    # SessionReferenceCleanerProtocol — consumed by story/task services
    # ------------------------------------------------------------------

    def clear_references_to_story(self, story_id: uuid.UUID) -> None:
        self._repo.clear_linked_story(story_id)

    def clear_references_to_task(self, task_id: uuid.UUID) -> None:
        self._repo.clear_linked_task(task_id)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _assert_project_exists(self, project_id: str) -> uuid.UUID:
        project = self._project_repo.get_by_id(project_id)
        if project is None:
            raise NotFoundError(f"Project '{project_id}' not found.")
        return project.id

    def _assert_participant_role_valid(self, project_id: str, role: str) -> None:
        allowed = self._effective_dict.resolve(project_id, DICT_KEY_PARTICIPANT_ROLES)
        if role not in allowed:
            allowed_str = ", ".join(allowed)
            raise UnprocessableError(
                _PARTICIPANT_ROLE_VIOLATION_MSG.format(v=role, allowed=allowed_str)
            )

    def _assert_story_in_project(
        self, story_id: str, project_uuid: uuid.UUID
    ) -> uuid.UUID:
        story = self._story_reader.get_by_id(story_id)
        if story is None:
            raise NotFoundError(_LINKED_STORY_NOT_FOUND_MSG.format(v=story_id))
        if story.project_id != project_uuid:
            raise UnprocessableError(_LINKED_STORY_WRONG_PROJECT_MSG)
        return story.id

    def _assert_task_in_project(
        self, task_id: str, project_uuid: uuid.UUID
    ) -> uuid.UUID:
        task = self._task_reader.get_by_id(task_id)
        if task is None:
            raise NotFoundError(_LINKED_TASK_NOT_FOUND_MSG.format(v=task_id))
        story = self._story_reader.get_by_id(task.story_id)
        if story is None or story.project_id != project_uuid:
            raise UnprocessableError(_LINKED_TASK_WRONG_PROJECT_MSG)
        return task.id
