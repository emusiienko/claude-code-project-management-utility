import datetime
import uuid
from typing import TYPE_CHECKING, Protocol, runtime_checkable

from app.attachments.schema import CONTAINER_STORY
# Import only the Protocol, never the concrete AttachmentService.
from app.attachments.service import AttachmentReaderProtocol
from app.comments.schema import CONTAINER_STORY as COMMENT_CONTAINER_STORY
# Import only the Protocol, never the concrete CommentService.
from app.comments.service import CommentReaderProtocol
from app.core.errors import NotFoundError, UnprocessableError
from app.projects.repository import ProjectRepository
# Import only the Protocol, never the concrete SessionService.
from app.sessions.service import SessionReferenceCleanerProtocol
from app.settings.schema import DICT_KEY_STORY_STATUSES
# Import only the Protocol, never the concrete SettingsService.
from app.settings.service import EffectiveDictionary
from app.stories.model import Story
from app.stories.repository import StoryRepository
from app.stories.schema import CreateStory, StoryAggregate, StoryDetail, UpdateStory

if TYPE_CHECKING:
    from app.milestones.model import Milestone as MilestoneModel

_STATUS_VIOLATION_MSG = (
    "Status value '{v}' is not allowed. Allowed: {allowed}."
)
_MILESTONE_WRONG_PROJECT_MSG = (
    "This milestone does not belong to the story's project."
)

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


class StoryService:
    def __init__(
        self,
        repo: StoryRepository,
        project_repo: ProjectRepository,
        effective_dict: EffectiveDictionary,
        milestone_repo: "MilestoneRepositoryProtocol | None" = None,
        task_counter: "TaskCounterProtocol | None" = None,
        story_link_reader: "StoryLinkReaderProtocol | None" = None,
        attachment_reader: AttachmentReaderProtocol | None = None,
        comment_reader: CommentReaderProtocol | None = None,
        session_reference_cleaner: SessionReferenceCleanerProtocol | None = None,
    ) -> None:
        self._repo = repo
        self._project_repo = project_repo
        self._effective_dict = effective_dict
        self._milestone_repo = milestone_repo
        self._task_counter = task_counter
        self._story_link_reader = story_link_reader
        self._attachment_reader = attachment_reader
        self._comment_reader = comment_reader
        self._session_reference_cleaner = session_reference_cleaner

    def create(self, data: CreateStory) -> Story:
        project_id = data.project_id
        self._assert_project_exists(project_id)

        if data.status is not None:
            self._assert_status_valid(project_id, data.status)

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        labels = [label.model_dump() for label in data.labels]
        # project_id coercion delegated to the repository layer (ADR-011);
        # a malformed string raises NotFoundError here before the model is built.
        project_uuid = self._repo.coerce_project_id(project_id)

        milestone_uuid: uuid.UUID | None = None
        if data.milestone_id is not None:
            milestone_uuid = self._assert_milestone_valid(
                data.milestone_id, project_uuid
            )

        story = Story(
            id=uuid.uuid4(),
            project_id=project_uuid,
            title=data.title,
            content=data.content,
            status=data.status,
            labels=labels,
            milestone_id=milestone_uuid,
            created_at=now,
            updated_at=now,
        )
        return self._repo.save(story)

    def get(self, story_id: str, project_id: str) -> Story:
        story = self._repo.get_by_id_and_project(story_id, project_id)
        if story is None:
            raise NotFoundError(f"Story '{story_id}' not found.")
        return story

    def get_by_id(self, story_id: str) -> Story:
        story = self._repo.get_by_id(story_id)
        if story is None:
            raise NotFoundError(f"Story '{story_id}' not found.")
        return story

    def list_paginated(
        self,
        project_id: str,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
        status_filter: str | None = None,
        label_key_filter: str | None = None,
        label_value_filter: str | None = None,
        milestone_id_filter: str | None = None,
    ) -> tuple[list[Story], int]:
        self._assert_project_exists(project_id)

        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit

        # An unknown milestone_id yields an empty page (not an error), so we
        # coerce here and pass None when the id is malformed (which can never
        # match a real milestone UUID).
        mid_filter_uuid: uuid.UUID | None = None
        if milestone_id_filter is not None:
            try:
                mid_filter_uuid = uuid.UUID(milestone_id_filter)
            except ValueError:
                # Malformed UUID cannot match any row — treat as empty filter.
                return [], 0

        return self._repo.list_paginated(
            project_id=project_id,
            limit=effective_limit,
            offset=offset,
            status_filter=status_filter,
            label_key_filter=label_key_filter,
            label_value_filter=label_value_filter,
            milestone_id_filter=mid_filter_uuid,
        )

    def update(
        self,
        story_id: str,
        project_id: str,
        data: UpdateStory,
    ) -> Story:
        story = self.get(story_id, project_id)

        if data.status is not None:
            self._assert_status_valid(project_id, data.status)

        if data.title is not None:
            story.title = data.title

        if "content" in data.model_fields_set:
            # Explicit null clears content; omission leaves it unchanged.
            story.content = data.content

        if "status" in data.model_fields_set:
            # Explicit null removes a previously-set status; null is always valid.
            story.status = data.status

        if data.labels is not None:
            # Labels fully replace when provided; [] clears all labels (valid).
            story.labels = [label.model_dump() for label in data.labels]

        if "milestone_id" in data.model_fields_set:
            if data.milestone_id is None:
                # Clearing the assignment is always allowed.
                story.milestone_id = None
            else:
                project_uuid = self._repo.coerce_project_id(project_id)
                story.milestone_id = self._assert_milestone_valid(
                    data.milestone_id, project_uuid
                )

        story.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(story)

    def get_detail(self, story_id: str) -> tuple[Story, list, list, list]:
        story = self.get_by_id(story_id)
        links: list = []
        if self._story_link_reader is not None:
            links = self._story_link_reader.list_all_enriched_for_story(story.id)
        attachments: list = []
        if self._attachment_reader is not None:
            attachments = self._attachment_reader.list_all_for_container(
                CONTAINER_STORY, story.id
            )
        comments: list = []
        if self._comment_reader is not None:
            comments = self._comment_reader.list_all_for_container(
                COMMENT_CONTAINER_STORY, story.id
            )
        return story, links, attachments, comments

    def delete(self, story_id: str, project_id: str) -> None:
        story = self.get(story_id, project_id)
        # Application-level cascade: remove all story links referencing this story
        # before deleting it. SQLite's ON DELETE CASCADE is inert without
        # PRAGMA foreign_keys = ON (Known Divergences — architecture.md).
        if self._story_link_reader is not None:
            self._story_link_reader.delete_all_for_story(story.id)
        # Application-level cascade (ADR-018 precedent, extended to the
        # no-FK polymorphic attachment container): remove the story's
        # attachments — rows and files — before the story itself is removed.
        if self._attachment_reader is not None:
            self._attachment_reader.delete_all_for_container(
                CONTAINER_STORY, story.id
            )
        # Same cascade contract, extended to comments (STORY-008 TASK-004).
        if self._comment_reader is not None:
            self._comment_reader.delete_all_for_container(
                COMMENT_CONTAINER_STORY, story.id
            )
        # Same cascade contract, reverse direction (STORY-009 TASK-004): null
        # linked_story_id on every session referencing this story. Holds on
        # both dialects since SQLite's SET NULL FK action is inert.
        if self._session_reference_cleaner is not None:
            self._session_reference_cleaner.clear_references_to_story(story.id)
        self._repo.delete(story)

    def get_aggregate(self, story_id: str) -> StoryAggregate:
        story = self.get_by_id(story_id)

        if self._task_counter is None:
            return StoryAggregate(
                story_id=story.id,
                total_tasks=0,
                by_status={},
            )

        by_status = self._task_counter.get_status_counts(story.id)
        total = sum(by_status.values())
        return StoryAggregate(
            story_id=story.id,
            total_tasks=total,
            by_status=by_status,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _assert_project_exists(self, project_id: str) -> None:
        if not self._project_repo.exists(project_id):
            raise NotFoundError(f"Project '{project_id}' not found.")

    def _assert_status_valid(self, project_id: str, status: str) -> None:
        allowed = self._effective_dict.resolve(project_id, DICT_KEY_STORY_STATUSES)
        if status not in allowed:
            allowed_str = ", ".join(allowed)
            raise UnprocessableError(
                _STATUS_VIOLATION_MSG.format(v=status, allowed=allowed_str)
            )

    def _assert_milestone_valid(
        self, milestone_id: str, project_uuid: uuid.UUID
    ) -> uuid.UUID:
        if self._milestone_repo is None:
            raise NotFoundError(f"Milestone '{milestone_id}' not found.")

        milestone = self._milestone_repo.get_by_id(milestone_id)
        if milestone is None:
            raise NotFoundError(f"Milestone '{milestone_id}' not found.")

        if milestone.project_id != project_uuid:
            raise UnprocessableError(_MILESTONE_WRONG_PROJECT_MSG)

        return milestone.id


@runtime_checkable
class MilestoneRepositoryProtocol(Protocol):
    def get_by_id(self, milestone_id: str) -> "MilestoneModel | None": ...


@runtime_checkable
class TaskCounterProtocol(Protocol):
    def get_status_counts(self, story_id: uuid.UUID) -> dict[str, int]: ...


@runtime_checkable
class StoryLinkReaderProtocol(Protocol):
    def list_all_enriched_for_story(self, story_id: uuid.UUID) -> list: ...

    def delete_all_for_story(self, story_id: uuid.UUID) -> None: ...
