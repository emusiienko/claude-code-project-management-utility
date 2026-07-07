import datetime
import uuid

from app.core.errors import NotFoundError, UnprocessableError
from app.projects.repository import ProjectRepository
from app.settings.schema import DICT_KEY_STORY_STATUSES
# Import only the Protocol, never the concrete SettingsService.
from app.settings.service import EffectiveDictionary
from app.stories.model import Story
from app.stories.repository import StoryRepository
from app.stories.schema import CreateStory, UpdateStory

_STATUS_VIOLATION_MSG = (
    "Status value '{v}' is not allowed. Allowed: {allowed}."
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
    ) -> None:
        self._repo = repo
        self._project_repo = project_repo
        self._effective_dict = effective_dict

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
        story = Story(
            id=uuid.uuid4(),
            project_id=project_uuid,
            title=data.title,
            content=data.content,
            status=data.status,
            labels=labels,
            milestone_id=None,
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
    ) -> tuple[list[Story], int]:
        self._assert_project_exists(project_id)

        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit
        return self._repo.list_paginated(
            project_id=project_id,
            limit=effective_limit,
            offset=offset,
            status_filter=status_filter,
            label_key_filter=label_key_filter,
            label_value_filter=label_value_filter,
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

        story.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(story)

    def delete(self, story_id: str, project_id: str) -> None:
        story = self.get(story_id, project_id)
        self._repo.delete(story)

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
