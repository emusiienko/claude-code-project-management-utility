import datetime
import uuid

from app.attachments.schema import CONTAINER_MILESTONE

# Import only the Protocol, never the concrete AttachmentService.
from app.attachments.service import AttachmentReaderProtocol
from app.comments.schema import CONTAINER_MILESTONE as COMMENT_CONTAINER_MILESTONE

# Import only the Protocol, never the concrete CommentService.
from app.comments.service import CommentReaderProtocol
from app.core.errors import ConflictError, NotFoundError
from app.milestones.model import Milestone
from app.milestones.repository import MilestoneRepository
from app.milestones.schema import (
    MILESTONE_STATUS_ACTIVE,
    MILESTONE_STATUS_FINISHED,
    MILESTONE_STATUS_PLANNED,
    CreateMilestone,
    UpdateMilestone,
)
from app.projects.repository import ProjectRepository
from app.stories.model import Story
from app.stories.repository import StoryRepository

_NAME_CONFLICT_MSG = "A milestone named '{name}' already exists in this project."

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


class MilestoneService:
    def __init__(
        self,
        repo: MilestoneRepository,
        project_repo: ProjectRepository,
        story_repo: StoryRepository,
        attachment_reader: AttachmentReaderProtocol | None = None,
        comment_reader: CommentReaderProtocol | None = None,
    ) -> None:
        self._repo = repo
        self._project_repo = project_repo
        self._story_repo = story_repo
        self._attachment_reader = attachment_reader
        self._comment_reader = comment_reader

    def create(self, data: CreateMilestone) -> Milestone:
        self._assert_project_exists(data.project_id)
        project_uuid = self._repo.coerce_project_id(data.project_id)
        self._assert_name_unique(data.name, project_uuid, exclude_id=None)

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        milestone = Milestone(
            id=uuid.uuid4(),
            project_id=project_uuid,
            name=data.name,
            description=data.description,
            status=MILESTONE_STATUS_PLANNED,
            created_at=now,
            updated_at=now,
        )
        return self._repo.save(milestone)

    def get(self, milestone_id: str) -> Milestone:
        milestone = self._repo.get_by_id(milestone_id)
        if milestone is None:
            raise NotFoundError(f"Milestone '{milestone_id}' not found.")
        return milestone

    def get_with_story_count(self, milestone_id: str) -> tuple[Milestone, int]:
        milestone = self.get(milestone_id)
        mid = self._repo.coerce_milestone_id(milestone_id)
        count = self._repo.get_story_count(mid)
        return milestone, count

    def list_paginated(
        self,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
        project_id: str | None = None,
    ) -> tuple[list[tuple[Milestone, int]], int]:
        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit

        project_uuid: uuid.UUID | None = None
        if project_id is not None:
            project_uuid = self._repo.coerce_project_id(project_id)

        milestones, total = self._repo.list_paginated(
            limit=effective_limit,
            offset=offset,
            project_id=project_uuid,
        )

        # Resolve all story counts in a single batched query.
        milestone_ids = [m.id for m in milestones]
        counts_by_id = self._repo.get_story_counts(milestone_ids)
        rows = [(m, counts_by_id.get(m.id, 0)) for m in milestones]
        return rows, total

    def update(self, milestone_id: str, data: UpdateMilestone) -> Milestone:
        milestone = self.get(milestone_id)

        if data.name is not None:
            self._assert_name_unique(
                data.name, milestone.project_id, exclude_id=milestone.id
            )
            milestone.name = data.name

        if "description" in data.model_fields_set:
            # Explicit null clears description; omission leaves it unchanged.
            milestone.description = data.description

        milestone.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(milestone)

    def get_detail(self, milestone_id: str) -> tuple[Milestone, list, list]:
        milestone = self.get(milestone_id)
        attachments: list = []
        if self._attachment_reader is not None:
            attachments = self._attachment_reader.list_all_for_container(
                CONTAINER_MILESTONE, milestone.id
            )
        comments: list = []
        if self._comment_reader is not None:
            comments = self._comment_reader.list_all_for_container(
                COMMENT_CONTAINER_MILESTONE, milestone.id
            )
        return milestone, attachments, comments

    def delete(self, milestone_id: str) -> None:
        milestone = self.get(milestone_id)
        mid = milestone.id
        # Application-level cascade (ADR-020: the polymorphic container has no
        # FK, so the database cannot cascade it): remove the milestone's
        # attachments — rows and files — before the milestone itself is removed.
        if self._attachment_reader is not None:
            self._attachment_reader.delete_all_for_container(CONTAINER_MILESTONE, mid)
        # Same cascade contract, extended to comments (STORY-008 TASK-004).
        if self._comment_reader is not None:
            self._comment_reader.delete_all_for_container(
                COMMENT_CONTAINER_MILESTONE, mid
            )
        self._repo.delete(milestone)

    def activate(self, milestone_id: str) -> Milestone:
        milestone = self.get(milestone_id)

        if milestone.status == MILESTONE_STATUS_ACTIVE:
            # Idempotent: already active, return unchanged.
            return milestone

        # Demote any currently-active milestone in the same project atomically.
        # The demote + promote pair runs in the caller's existing transaction so
        # the project never has two active milestones at any point.
        current_active = self._repo.get_active_for_project(milestone.project_id)
        if current_active is not None:
            current_active.status = MILESTONE_STATUS_PLANNED
            current_active.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
            self._repo.save(current_active)

        milestone.status = MILESTONE_STATUS_ACTIVE
        milestone.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(milestone)

    def finish(self, milestone_id: str) -> Milestone:
        milestone = self.get(milestone_id)

        if milestone.status == MILESTONE_STATUS_FINISHED:
            # Idempotent: already finished, return unchanged.
            return milestone

        milestone.status = MILESTONE_STATUS_FINISHED
        milestone.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(milestone)

    def list_stories(
        self,
        milestone_id: str,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
    ) -> tuple[list[Story], int]:
        # Asserts the milestone exists, then delegates to the story repository.
        milestone = self.get(milestone_id)
        mid = milestone.id

        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit

        return self._story_repo.list_paginated_by_milestone(
            milestone_id=mid,
            limit=effective_limit,
            offset=offset,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _assert_project_exists(self, project_id: str) -> None:
        if not self._project_repo.exists(project_id):
            raise NotFoundError(f"Project '{project_id}' not found.")

    def _assert_name_unique(
        self,
        name: str,
        project_id: uuid.UUID,
        exclude_id: uuid.UUID | None,
    ) -> None:
        conflict = self._repo.get_name_conflict(name, project_id, exclude_id=exclude_id)
        if conflict is not None:
            raise ConflictError(_NAME_CONFLICT_MSG.format(name=name))
