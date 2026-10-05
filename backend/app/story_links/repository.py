import uuid

from sqlalchemy import func, or_, select

from app.core.database.repository import BaseRepository
from app.stories.model import Story
from app.story_links.model import StoryLink


class StoryLinkRepository(BaseRepository[StoryLink]):
    model_class = StoryLink

    def coerce_story_id(self, story_id: str | uuid.UUID) -> uuid.UUID:
        return self._coerce_uuid(story_id, "Story")

    def find_duplicate(
        self,
        source_story_id: uuid.UUID,
        target_story_id: uuid.UUID,
        link_type: str,
    ) -> StoryLink | None:
        stmt = select(StoryLink).where(
            StoryLink.source_story_id == source_story_id,
            StoryLink.target_story_id == target_story_id,
            StoryLink.link_type == link_type,
        )
        return self._session.scalars(stmt).first()

    def list_for_story(
        self,
        story_id: uuid.UUID,
        direction: str,
        link_type_filter: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[StoryLink], int]:
        # Build the base query scoped to the direction filter.
        if direction == "outbound":
            direction_clause = StoryLink.source_story_id == story_id
        elif direction == "inbound":
            direction_clause = StoryLink.target_story_id == story_id
        else:
            direction_clause = or_(
                StoryLink.source_story_id == story_id,
                StoryLink.target_story_id == story_id,
            )

        base_stmt = select(StoryLink).where(direction_clause)

        if link_type_filter is not None:
            base_stmt = base_stmt.where(StoryLink.link_type == link_type_filter)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = self._session.execute(count_stmt).scalar_one()

        rows_stmt = (
            base_stmt.order_by(StoryLink.created_at.asc()).limit(limit).offset(offset)
        )
        rows = list(self._session.scalars(rows_stmt).all())
        return rows, total

    def get_linked_story_summaries(
        self, story_ids: set[uuid.UUID]
    ) -> dict[uuid.UUID, Story]:
        # Batch-load linked story summaries in one query (no N+1).
        # Reads the story table directly through this repository's own session —
        # does not call the stories service to avoid circular imports.
        if not story_ids:
            return {}
        stmt = select(Story).where(Story.id.in_(story_ids))
        rows = self._session.scalars(stmt).all()
        return {row.id: row for row in rows}

    def list_all_for_story(self, story_id: uuid.UUID) -> list[StoryLink]:
        stmt = select(StoryLink).where(
            or_(
                StoryLink.source_story_id == story_id,
                StoryLink.target_story_id == story_id,
            )
        )
        return list(self._session.scalars(stmt).all())
