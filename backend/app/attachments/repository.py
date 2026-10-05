import uuid

from sqlalchemy import delete, func, select

from app.attachments.model import Attachment
from app.core.database.repository import BaseRepository


class AttachmentRepository(BaseRepository[Attachment]):
    model_class = Attachment

    def coerce_container_id(self, container_id: str | uuid.UUID) -> uuid.UUID:
        # Exposed so the service can get a validated UUID for model construction
        # without UUID parsing outside the data layer (ADR-011).
        return self._coerce_uuid(container_id, "Container")

    def list_paginated(
        self,
        container_type: str,
        container_id: uuid.UUID,
        limit: int,
        offset: int,
        kind_filter: str | None = None,
    ) -> tuple[list[Attachment], int]:
        base_stmt = select(Attachment).where(
            Attachment.container_type == container_type,
            Attachment.container_id == container_id,
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
        # Enumerates every attachment on a container ahead of a cascade delete,
        # so the caller can remove each stored file before the rows are dropped.
        stmt = select(Attachment).where(
            Attachment.container_type == container_type,
            Attachment.container_id == container_id,
        )
        return list(self._session.scalars(stmt).all())

    def delete_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> None:
        # Removes every attachment row on a container. Called explicitly on
        # container delete — container_id has no FK, so there is no CASCADE
        # to rely on for either dialect.
        stmt = select(Attachment).where(
            Attachment.container_type == container_type,
            Attachment.container_id == container_id,
        )
        rows = list(self._session.scalars(stmt).all())
        for row in rows:
            self._session.delete(row)
        if rows:
            self._session.flush()

    def list_all_for_containers(
        self, container_type: str, container_ids: list[uuid.UUID]
    ) -> list[Attachment]:
        # Bulk sibling of list_all_for_container: one IN query for a whole set
        # of containers, so a transitive cascade never queries per container.
        if not container_ids:
            return []
        stmt = select(Attachment).where(
            Attachment.container_type == container_type,
            Attachment.container_id.in_(container_ids),
        )
        return list(self._session.scalars(stmt).all())

    def delete_all_for_containers(
        self, container_type: str, container_ids: list[uuid.UUID]
    ) -> None:
        if not container_ids:
            return
        self._session.execute(
            delete(Attachment).where(
                Attachment.container_type == container_type,
                Attachment.container_id.in_(container_ids),
            )
        )
        self._session.flush()
