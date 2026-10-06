import uuid

from sqlalchemy import func, select

from app.core.database.repository import BaseRepository
from app.sessions.model import Session
from app.sessions.schema import SESSION_STATUS_FINISHED


class SessionRepository(BaseRepository[Session]):
    model_class = Session

    def coerce_project_id(self, project_id: str | uuid.UUID) -> uuid.UUID:
        return self._coerce_uuid(project_id, "Project")

    def coerce_story_id(self, story_id: str | uuid.UUID) -> uuid.UUID:
        return self._coerce_uuid(story_id, "Story")

    def coerce_task_id(self, task_id: str | uuid.UUID) -> uuid.UUID:
        return self._coerce_uuid(task_id, "Task")

    def list_paginated(
        self,
        project_id: uuid.UUID,
        limit: int,
        offset: int,
        incomplete_only: bool = False,
        linked_story_id: uuid.UUID | None = None,
        include_archived: bool = False,
    ) -> tuple[list[Session], int]:
        base_stmt = select(Session).where(Session.project_id == project_id)

        if not include_archived:
            base_stmt = base_stmt.where(Session.archived_at.is_(None))

        if incomplete_only:
            base_stmt = base_stmt.where(Session.status != SESSION_STATUS_FINISHED)

        if linked_story_id is not None:
            base_stmt = base_stmt.where(Session.linked_story_id == linked_story_id)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = self._session.execute(count_stmt).scalar_one()

        rows_stmt = (
            base_stmt.order_by(Session.created_at.desc(), Session.id.desc())
            .limit(limit)
            .offset(offset)
        )
        rows = list(self._session.scalars(rows_stmt).all())
        return rows, total
