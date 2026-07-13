import datetime
import uuid

from app.core.errors import ConflictError, NotFoundError, UnprocessableError
from app.settings.schema import DICT_KEY_LINK_TYPES
from app.settings.service import EffectiveDictionary
from app.stories.repository import StoryRepository
from app.task_links.model import TaskLink
from app.task_links.repository import TaskLinkRepository
from app.task_links.schema import CreateTaskLink, EnrichedTaskLink, LinkedTaskSummary
from app.tasks.repository import TaskRepository

_SELF_LINK_MSG = "A task cannot link to itself."
_DIFFERENT_STORIES_MSG = "Cannot link tasks from different stories."
_LINK_TYPE_VIOLATION_MSG = (
    "Value '{v}' is not allowed for field 'link_type'. Allowed: {allowed}."
)
_DUPLICATE_LINK_MSG = "This link already exists."

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


class TaskLinkService:
    def __init__(
        self,
        repo: TaskLinkRepository,
        task_repo: TaskRepository,
        story_repo: StoryRepository,
        effective_dict: EffectiveDictionary,
    ) -> None:
        self._repo = repo
        self._task_repo = task_repo
        self._story_repo = story_repo
        self._effective_dict = effective_dict

    def create(self, source_task_id: str, data: CreateTaskLink) -> TaskLink:
        # Rule 1: source task must exist.
        source_task = self._task_repo.get_by_id(source_task_id)
        if source_task is None:
            raise NotFoundError(f"Task '{source_task_id}' not found.")

        # Rule 1: target task must exist.
        target_task = self._task_repo.get_by_id(data.target_task_id)
        if target_task is None:
            raise NotFoundError(f"Task '{data.target_task_id}' not found.")

        # Rule 2: tasks must belong to the same story.
        if source_task.story_id != target_task.story_id:
            raise UnprocessableError(_DIFFERENT_STORIES_MSG)

        # Rule 3: no self-link.
        if source_task.id == target_task.id:
            raise UnprocessableError(_SELF_LINK_MSG)

        # Rule 4: link_type must be in the project's effective link_types dictionary.
        project_id = self._resolve_project_id_for_story(str(source_task.story_id))
        self._assert_link_type_valid(project_id, data.link_type)

        # Rule 5: no duplicate (source, target, link_type).
        existing = self._repo.find_duplicate(
            source_task_id=source_task.id,
            target_task_id=target_task.id,
            link_type=data.link_type,
        )
        if existing is not None:
            raise ConflictError(_DUPLICATE_LINK_MSG)

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        link = TaskLink(
            id=uuid.uuid4(),
            source_task_id=source_task.id,
            target_task_id=target_task.id,
            link_type=data.link_type,
            created_at=now,
        )
        return self._repo.save(link)

    def get_by_id(self, link_id: str) -> TaskLink:
        link = self._repo.get_by_id(link_id)
        if link is None:
            raise NotFoundError(f"TaskLink '{link_id}' not found.")
        return link

    def list_for_task(
        self,
        task_id: str,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
        direction: str = "both",
        link_type_filter: str | None = None,
    ) -> tuple[list[EnrichedTaskLink], int]:
        task = self._task_repo.get_by_id(task_id)
        if task is None:
            raise NotFoundError(f"Task '{task_id}' not found.")

        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit

        task_uuid = self._repo.coerce_task_id(task_id)

        links, total = self._repo.list_for_task(
            task_id=task_uuid,
            direction=direction,
            link_type_filter=link_type_filter,
            limit=effective_limit,
            offset=offset,
        )

        enriched = self._enrich_links(task_uuid, links)
        return enriched, total

    def delete(self, link_id: str) -> None:
        link = self.get_by_id(link_id)
        self._repo.delete(link)

    def list_all_enriched_for_task(
        self, task_id: uuid.UUID
    ) -> list[EnrichedTaskLink]:
        links = self._repo.list_all_for_task(task_id)
        return self._enrich_links(task_id, links)

    def delete_all_for_task(self, task_id: uuid.UUID) -> None:
        self._repo.delete_all_for_task(task_id)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _enrich_links(
        self, viewed_task_id: uuid.UUID, links: list[TaskLink]
    ) -> list[EnrichedTaskLink]:
        if not links:
            return []

        counterpart_ids: set[uuid.UUID] = set()
        for link in links:
            if link.source_task_id == viewed_task_id:
                counterpart_ids.add(link.target_task_id)
            else:
                counterpart_ids.add(link.source_task_id)

        # Batch-load all counterpart summaries in one query.
        summaries = self._repo.get_linked_task_summaries(counterpart_ids)

        result: list[EnrichedTaskLink] = []
        for link in links:
            if link.source_task_id == viewed_task_id:
                direction = "outbound"
                counterpart_id = link.target_task_id
            else:
                direction = "inbound"
                counterpart_id = link.source_task_id

            counterpart_task = summaries.get(counterpart_id)
            if counterpart_task is None:
                # Guard: skip orphaned links (should not happen under normal operation).
                continue

            linked_summary = LinkedTaskSummary(
                id=counterpart_task.id,
                title=counterpart_task.title,
                status=counterpart_task.status,
            )
            result.append(
                EnrichedTaskLink(
                    id=link.id,
                    source_task_id=link.source_task_id,
                    target_task_id=link.target_task_id,
                    link_type=link.link_type,
                    created_at=link.created_at,
                    direction=direction,
                    linked_task=linked_summary,
                )
            )
        return result

    def _resolve_project_id_for_story(self, story_id: str) -> str:
        # Resolves the project transitively: task → story → project.
        story = self._story_repo.get_by_id(story_id)
        if story is None:
            raise NotFoundError(f"Story '{story_id}' not found.")
        return str(story.project_id)

    def _assert_link_type_valid(self, project_id: str, link_type: str) -> None:
        allowed = self._effective_dict.resolve(project_id, DICT_KEY_LINK_TYPES)
        if link_type not in allowed:
            allowed_str = ", ".join(allowed)
            raise UnprocessableError(
                _LINK_TYPE_VIOLATION_MSG.format(v=link_type, allowed=allowed_str)
            )
