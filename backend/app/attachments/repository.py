import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import InstrumentedAttribute

from app.attachments.model import Attachment
from app.attachments.schema import CONTAINER_MILESTONE, CONTAINER_STORY, CONTAINER_TASK
from app.core.database.repository import BaseRepository


class AttachmentRepository(BaseRepository[Attachment]):
    model_class = Attachment

    @staticmethod
    def container_column(
        container_type: str,
    ) -> InstrumentedAttribute[uuid.UUID | None]:
        return {
            CONTAINER_STORY: Attachment.story_id,
            CONTAINER_TASK: Attachment.task_id,
            CONTAINER_MILESTONE: Attachment.milestone_id,
        }[container_type]

    def coerce_container_id(self, container_id: str | uuid.UUID) -> uuid.UUID:
        # Exposed so the service can get a validated UUID for model construction
        # without UUID parsing outside the data layer (ADR-011).
        return self._coerce_uuid(container_id, "Container")

    def list_file_paths(self) -> set[str]:
        stmt = select(Attachment.file_path).where(Attachment.file_path.is_not(None))
        return set(self._session.scalars(stmt).all())

    def list_paginated(
        self,
        container_type: str,
        container_id: uuid.UUID,
        limit: int,
        offset: int,
        kind_filter: str | None = None,
    ) -> tuple[list[Attachment], int]:
        base_stmt = select(Attachment).where(
            self.container_column(container_type) == container_id
        )

        if kind_filter is not None:
            base_stmt = base_stmt.where(Attachment.kind == kind_filter)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = self._session.execute(count_stmt).scalar_one()

        rows_stmt = (
            base_stmt.order_by(Attachment.created_at.asc()).limit(limit).offset(offset)
        )
        rows = list(self._session.scalars(rows_stmt).all())
        return rows, total

    def list_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> list[Attachment]:
        stmt = select(Attachment).where(
            self.container_column(container_type) == container_id
        )
        return list(self._session.scalars(stmt).all())
