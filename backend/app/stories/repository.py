import uuid

from sqlalchemy import func, select

from app.core.database.json_utils import apply_json_array_filter
from app.core.database.repository import BaseRepository
from app.stories.model import Story

_STORY_TABLE_ALIAS = "story"


class StoryRepository(BaseRepository[Story]):
    model_class = Story

    def coerce_project_id(self, project_id: str | uuid.UUID) -> uuid.UUID:
        # Exposed so the service can get a validated UUID for model construction
        # without UUID parsing outside the data layer (ADR-011).
        return self._coerce_uuid(project_id, "Project")

    def get_by_id_and_project(
        self,
        story_id: str | uuid.UUID,
        project_id: str | uuid.UUID,
    ) -> Story | None:
        sid = self._coerce_uuid(story_id, "Story")
        pid = self._coerce_uuid(project_id, "Project")
        stmt = select(Story).where(Story.id == sid, Story.project_id == pid)
        return self._session.scalars(stmt).first()

    def list_paginated(
        self,
        project_id: str | uuid.UUID,
        limit: int,
        offset: int,
        status_filter: str | None = None,
        label_key_filter: str | None = None,
        label_value_filter: str | None = None,
    ) -> tuple[list[Story], int]:
        pid = self._coerce_uuid(project_id, "Project")

        base_stmt = select(Story).where(Story.project_id == pid)

        if status_filter is not None:
            base_stmt = base_stmt.where(Story.status == status_filter)

        if label_key_filter is not None or label_value_filter is not None:
            base_stmt = apply_json_array_filter(
                base_stmt,
                self._session,
                _STORY_TABLE_ALIAS,
                label_key_filter,
                label_value_filter,
            )

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = self._session.execute(count_stmt).scalar_one()

        rows_stmt = (
            base_stmt
            .order_by(Story.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        rows = list(self._session.scalars(rows_stmt).all())
        return rows, total
