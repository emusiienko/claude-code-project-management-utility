import datetime
import uuid

from app.core.errors import ConflictError, NotFoundError, UnprocessableError
from app.settings.schema import DICT_KEY_LINK_TYPES
from app.settings.service import EffectiveDictionary
from app.stories.repository import StoryRepository
from app.story_links.model import StoryLink
from app.story_links.repository import StoryLinkRepository
from app.story_links.schema import (
    CreateStoryLink,
    EnrichedStoryLink,
    LinkedStorySummary,
)

_SELF_LINK_MSG = "A story cannot link to itself."
_DIFFERENT_PROJECTS_MSG = "Cannot link stories from different projects."
_LINK_TYPE_VIOLATION_MSG = (
    "Value '{v}' is not allowed for field 'link_type'. Allowed: {allowed}."
)
_DUPLICATE_LINK_MSG = "This link already exists."

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


class StoryLinkService:
    def __init__(
        self,
        repo: StoryLinkRepository,
        story_repo: StoryRepository,
        effective_dict: EffectiveDictionary,
    ) -> None:
        self._repo = repo
        self._story_repo = story_repo
        self._effective_dict = effective_dict

    def create(self, source_story_id: str, data: CreateStoryLink) -> StoryLink:
        # Rule 1: source story must exist.
        source_story = self._story_repo.get_by_id(source_story_id)
        if source_story is None:
            raise NotFoundError(f"Story '{source_story_id}' not found.")

        # Rule 1: target story must exist.
        target_story = self._story_repo.get_by_id(data.target_story_id)
        if target_story is None:
            raise NotFoundError(f"Story '{data.target_story_id}' not found.")

        # Rule 2: stories must belong to the same project.
        if source_story.project_id != target_story.project_id:
            raise UnprocessableError(_DIFFERENT_PROJECTS_MSG)

        # Rule 3: no self-link.
        if source_story.id == target_story.id:
            raise UnprocessableError(_SELF_LINK_MSG)

        # Rule 4: link_type must be in the project's effective link_types dictionary.
        project_id = str(source_story.project_id)
        self._assert_link_type_valid(project_id, data.link_type)

        # Rule 5: no duplicate (source, target, link_type).
        existing = self._repo.find_duplicate(
            source_story_id=source_story.id,
            target_story_id=target_story.id,
            link_type=data.link_type,
        )
        if existing is not None:
            raise ConflictError(_DUPLICATE_LINK_MSG)

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        link = StoryLink(
            id=uuid.uuid4(),
            source_story_id=source_story.id,
            target_story_id=target_story.id,
            link_type=data.link_type,
            created_at=now,
        )
        return self._repo.save(link)

    def get_by_id(self, link_id: str) -> StoryLink:
        link = self._repo.get_by_id(link_id)
        if link is None:
            raise NotFoundError(f"StoryLink '{link_id}' not found.")
        return link

    def list_for_story(
        self,
        story_id: str,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
        direction: str = "both",
        link_type_filter: str | None = None,
    ) -> tuple[list[EnrichedStoryLink], int]:
        story = self._story_repo.get_by_id(story_id)
        if story is None:
            raise NotFoundError(f"Story '{story_id}' not found.")

        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit

        story_uuid = self._repo.coerce_story_id(story_id)

        links, total = self._repo.list_for_story(
            story_id=story_uuid,
            direction=direction,
            link_type_filter=link_type_filter,
            limit=effective_limit,
            offset=offset,
        )

        enriched = self._enrich_links(story_uuid, links)
        return enriched, total

    def delete(self, link_id: str) -> None:
        link = self.get_by_id(link_id)
        self._repo.delete(link)

    def list_all_enriched_for_story(
        self, story_id: uuid.UUID
    ) -> list[EnrichedStoryLink]:
        links = self._repo.list_all_for_story(story_id)
        return self._enrich_links(story_id, links)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _enrich_links(
        self, viewed_story_id: uuid.UUID, links: list[StoryLink]
    ) -> list[EnrichedStoryLink]:
        if not links:
            return []

        counterpart_ids: set[uuid.UUID] = set()
        for link in links:
            if link.source_story_id == viewed_story_id:
                counterpart_ids.add(link.target_story_id)
            else:
                counterpart_ids.add(link.source_story_id)

        # Batch-load all counterpart summaries in one query.
        summaries = self._repo.get_linked_story_summaries(counterpart_ids)

        result: list[EnrichedStoryLink] = []
        for link in links:
            if link.source_story_id == viewed_story_id:
                direction = "outbound"
                counterpart_id = link.target_story_id
            else:
                direction = "inbound"
                counterpart_id = link.source_story_id

            counterpart_story = summaries.get(counterpart_id)
            if counterpart_story is None:
                # Guard: skip orphaned links (should not happen under normal operation).
                continue

            linked_summary = LinkedStorySummary(
                id=counterpart_story.id,
                title=counterpart_story.title,
                status=counterpart_story.status,
            )
            result.append(
                EnrichedStoryLink(
                    id=link.id,
                    source_story_id=link.source_story_id,
                    target_story_id=link.target_story_id,
                    link_type=link.link_type,
                    created_at=link.created_at,
                    direction=direction,
                    linked_story=linked_summary,
                )
            )
        return result

    def _assert_link_type_valid(self, project_id: str, link_type: str) -> None:
        allowed = self._effective_dict.resolve(project_id, DICT_KEY_LINK_TYPES)
        if link_type not in allowed:
            allowed_str = ", ".join(allowed)
            raise UnprocessableError(
                _LINK_TYPE_VIOLATION_MSG.format(v=link_type, allowed=allowed_str)
            )
