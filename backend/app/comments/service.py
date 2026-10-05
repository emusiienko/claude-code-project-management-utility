import datetime
import uuid
from typing import TYPE_CHECKING, Protocol, runtime_checkable

from app.comments.model import Comment
from app.comments.repository import CommentRepository
from app.comments.schema import (
    ALL_CONTAINER_TYPES,
    CONTAINER_MILESTONE,
    CONTAINER_STORY,
    CONTAINER_TASK,
    CONTENT_MAX_LENGTH,
)
from app.comments.schema import Comment as CommentSchema
from app.comments.schema import (
    CreateComment,
    UpdateComment,
)
from app.core.errors import NotFoundError, UnprocessableError

if TYPE_CHECKING:
    from app.milestones.model import Milestone as MilestoneModel
    from app.stories.model import Story as StoryModel
    from app.tasks.model import Task as TaskModel

_CONTAINER_TYPE_INVALID_MSG = "container_type must be one of: {allowed}."
_CONTENT_REQUIRED_MSG = "Comment content is required."
_CONTENT_TOO_LONG_MSG = (
    f"Comment content must not exceed {CONTENT_MAX_LENGTH} characters."
)
_AUTHOR_ROLE_REQUIRED_MSG = "Comment author is required."
_REPLY_SAME_CONTAINER_MSG = (
    "A reply must be on the same story, task, or milestone as the comment "
    "it replies to."
)

_LIST_DEFAULT_LIMIT = 50
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


@runtime_checkable
class StoryReaderProtocol(Protocol):
    def get_by_id(self, story_id: str | uuid.UUID) -> "StoryModel | None": ...


@runtime_checkable
class TaskReaderProtocol(Protocol):
    def get_by_id(self, task_id: str | uuid.UUID) -> "TaskModel | None": ...


@runtime_checkable
class MilestoneReaderProtocol(Protocol):
    def get_by_id(self, milestone_id: str | uuid.UUID) -> "MilestoneModel | None": ...


@runtime_checkable
class CommentReaderProtocol(Protocol):
    """Satisfied structurally by CommentService; injected into the story,
    task, and milestone services (never the concrete class) so those domains
    can compose comments into their detail responses and cascade-remove
    them on container delete without depending on the comments package."""

    def list_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> list[CommentSchema]: ...

    def delete_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> None: ...

    def delete_all_for_containers(
        self, container_type: str, container_ids: list[uuid.UUID]
    ) -> None: ...


class CommentService:
    def __init__(
        self,
        repo: CommentRepository,
        story_reader: StoryReaderProtocol,
        task_reader: TaskReaderProtocol,
        milestone_reader: MilestoneReaderProtocol,
    ) -> None:
        self._repo = repo
        self._story_reader = story_reader
        self._task_reader = task_reader
        self._milestone_reader = milestone_reader

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create(
        self,
        container_type: str,
        container_id: str,
        data: CreateComment,
    ) -> Comment:
        # Validation precedence: container exists (404) -> content valid (422)
        # -> author_role valid (422) -> in_reply_to exists (404) -> in_reply_to
        # shares the same container (422).
        self._assert_container_type_valid(container_type)
        container_uuid = self._resolve_container(container_type, container_id)
        self._assert_content_valid(data.content)
        self._assert_author_role_not_empty(data.author_role)

        ancestors: list[str] = []
        if data.in_reply_to is not None:
            parent = self.get_by_id(data.in_reply_to)
            if (
                parent.container_type != container_type
                or parent.container_id != container_uuid
            ):
                raise UnprocessableError(_REPLY_SAME_CONTAINER_MSG)
            # Materialized ancestor path: computed once at create, immutable
            # thereafter. The direct parent is simply ancestors[-1].
            ancestors = [*parent.ancestors, str(parent.id)]

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        comment = Comment(
            id=uuid.uuid4(),
            container_type=container_type,
            container_id=container_uuid,
            content=data.content,
            author_role=data.author_role,
            labels=[label.model_dump() for label in data.labels],
            ancestors=ancestors,
            created_at=now,
            updated_at=now,
        )
        return self._repo.save(comment)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_by_id(self, comment_id: str) -> Comment:
        comment = self._repo.get_by_id(comment_id)
        if comment is None:
            raise NotFoundError(f"Comment '{comment_id}' not found.")
        return comment

    def get_ancestors(self, comment_id: str) -> list[Comment]:
        # Resolves the ordered (root-first) ancestor chain in a single query.
        # ancestors ids are already-validated internal data (computed by this
        # service at create, never raw client input), so parsing them back to
        # uuid.UUID here is a type conversion, not untrusted-input coercion.
        comment = self.get_by_id(comment_id)
        if not comment.ancestors:
            return []
        ids = [uuid.UUID(ancestor_id) for ancestor_id in comment.ancestors]
        return self._repo.list_by_ids(ids)

    def list_paginated(
        self,
        container_type: str,
        container_id: str,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
        label_key_filter: str | None = None,
        label_value_filter: str | None = None,
        descendant_of_filter: str | None = None,
        after_id_filter: str | None = None,
    ) -> tuple[list[Comment], int]:
        self._assert_container_type_valid(container_type)
        container_uuid = self._resolve_container(container_type, container_id)

        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit

        descendant_of_uuid = (
            self._repo.coerce_comment_id(descendant_of_filter)
            if descendant_of_filter is not None
            else None
        )
        after_id_uuid = (
            self._repo.coerce_comment_id(after_id_filter)
            if after_id_filter is not None
            else None
        )

        return self._repo.list_paginated(
            container_type=container_type,
            container_id=container_uuid,
            limit=effective_limit,
            offset=offset,
            label_key_filter=label_key_filter,
            label_value_filter=label_value_filter,
            descendant_of_filter=descendant_of_uuid,
            after_id_filter=after_id_uuid,
        )

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(self, comment_id: str, data: UpdateComment) -> Comment:
        # author_role and ancestors are immutable and are not fields on
        # UpdateComment at all, so there is nothing to silently ignore beyond
        # Pydantic's default extra="ignore" behavior on any stray input.
        comment = self.get_by_id(comment_id)

        if data.content is not None:
            comment.content = data.content

        if data.labels is not None:
            comment.labels = [label.model_dump() for label in data.labels]

        comment.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(comment)

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def delete(self, comment_id: str) -> None:
        comment = self.get_by_id(comment_id)
        self._repo.delete(comment)

    # ------------------------------------------------------------------
    # CommentReaderProtocol — consumed by story/task/milestone services
    # ------------------------------------------------------------------

    def list_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> list[CommentSchema]:
        rows = self._repo.list_all_for_container(container_type, container_id)
        return [CommentSchema.model_validate(row) for row in rows]

    def delete_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> None:
        self._repo.delete_all_for_container(container_type, container_id)

    def delete_all_for_containers(
        self, container_type: str, container_ids: list[uuid.UUID]
    ) -> None:
        self._repo.delete_all_for_containers(container_type, container_ids)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _assert_container_type_valid(container_type: str) -> None:
        if container_type not in ALL_CONTAINER_TYPES:
            allowed = ", ".join(sorted(ALL_CONTAINER_TYPES))
            raise UnprocessableError(
                _CONTAINER_TYPE_INVALID_MSG.format(allowed=allowed)
            )

    def _resolve_container(self, container_type: str, container_id: str) -> uuid.UUID:
        # Validates container existence (404) and returns its UUID.
        if container_type == CONTAINER_STORY:
            story = self._story_reader.get_by_id(container_id)
            if story is None:
                raise NotFoundError(f"Story '{container_id}' not found.")
            return story.id

        if container_type == CONTAINER_TASK:
            task = self._task_reader.get_by_id(container_id)
            if task is None:
                raise NotFoundError(f"Task '{container_id}' not found.")
            return task.id

        milestone = self._milestone_reader.get_by_id(container_id)
        if milestone is None:
            raise NotFoundError(f"Milestone '{container_id}' not found.")
        return milestone.id

    @staticmethod
    def _assert_content_valid(content: str) -> None:
        # Backstop across all create paths — the request-boundary schema
        # already rejects missing/empty/too-long content, but this keeps the
        # service itself safe against any future caller that skips schema
        # validation, and is what lets the container-exists-first precedence
        # be verified directly against the service.
        if not content or not content.strip():
            raise UnprocessableError(_CONTENT_REQUIRED_MSG)
        if len(content) > CONTENT_MAX_LENGTH:
            raise UnprocessableError(_CONTENT_TOO_LONG_MSG)

    @staticmethod
    def _assert_author_role_not_empty(author_role: str) -> None:
        if not author_role or not author_role.strip():
            raise UnprocessableError(_AUTHOR_ROLE_REQUIRED_MSG)
