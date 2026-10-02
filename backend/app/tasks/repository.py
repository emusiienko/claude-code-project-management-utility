import uuid

from sqlalchemy import func, select

from app.core.database.json_utils import apply_json_array_filter
from app.core.database.repository import BaseRepository
from app.tasks.model import Task

_TASK_TABLE_ALIAS = "task"


class TaskRepository(BaseRepository[Task]):
    model_class = Task

    def coerce_story_id(self, story_id: str | uuid.UUID) -> uuid.UUID:
        # Exposed so the service can get a validated UUID for model construction
        # without UUID parsing outside the data layer (ADR-011).
        return self._coerce_uuid(story_id, "Story")

    def get_by_id_and_story(
        self,
        task_id: str | uuid.UUID,
        story_id: str | uuid.UUID,
    ) -> Task | None:
        tid = self._coerce_uuid(task_id, "Task")
        sid = self._coerce_uuid(story_id, "Story")
        stmt = select(Task).where(Task.id == tid, Task.story_id == sid)
        return self._session.scalars(stmt).first()

    def list_paginated(
        self,
        story_id: str | uuid.UUID,
        limit: int,
        offset: int,
        status_filter: str | None = None,
        type_filter: str | None = None,
        assignee_role_filter: str | None = None,
        creator_role_filter: str | None = None,
        label_key_filter: str | None = None,
        label_value_filter: str | None = None,
    ) -> tuple[list[Task], int]:
        sid = self._coerce_uuid(story_id, "Story")

        base_stmt = select(Task).where(Task.story_id == sid)

        if status_filter is not None:
            base_stmt = base_stmt.where(Task.status == status_filter)

        if type_filter is not None:
            base_stmt = base_stmt.where(Task.type == type_filter)

        if assignee_role_filter is not None:
            base_stmt = base_stmt.where(Task.assignee_role == assignee_role_filter)

        if creator_role_filter is not None:
            base_stmt = base_stmt.where(Task.creator_role == creator_role_filter)

        if label_key_filter is not None or label_value_filter is not None:
            base_stmt = apply_json_array_filter(
                base_stmt,
                self._session,
                _TASK_TABLE_ALIAS,
                label_key_filter,
                label_value_filter,
            )

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = self._session.execute(count_stmt).scalar_one()

        rows_stmt = (
            base_stmt.order_by(Task.created_at.asc()).limit(limit).offset(offset)
        )
        rows = list(self._session.scalars(rows_stmt).all())
        return rows, total

    def list_all_for_stories(self, story_ids: list[uuid.UUID]) -> list[Task]:
        # Batched breadth read for the project work-state aggregate: one query
        # across every story in the project, never a query per story (no N+1).
        stmt = (
            select(Task)
            .where(Task.story_id.in_(story_ids))
            .order_by(Task.created_at.asc())
        )
        return list(self._session.scalars(stmt).all())

    def get_status_counts_for_stories(
        self, story_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, dict[str, int]]:
        # Batched sibling of get_status_counts: one GROUP BY across every story
        # in the project instead of one grouped query per story.
        stmt = (
            select(Task.story_id, Task.status, func.count(Task.id))
            .where(Task.story_id.in_(story_ids))
            .group_by(Task.story_id, Task.status)
        )
        rows = self._session.execute(stmt).all()
        result: dict[uuid.UUID, dict[str, int]] = {}
        for story_id, status, count in rows:
            result.setdefault(story_id, {})[status] = count
        return result

    def get_status_counts(self, story_id: uuid.UUID) -> dict[str, int]:
        # Returns per-status task counts for a single story in one grouped query
        # — used by the story aggregate endpoint to avoid an N-per-status query.
        stmt = (
            select(Task.status, func.count(Task.id))
            .where(Task.story_id == story_id)
            .group_by(Task.status)
        )
        rows = self._session.execute(stmt).all()
        return {row[0]: row[1] for row in rows}

    def get_total_count(self, story_id: uuid.UUID) -> int:
        stmt = select(func.count(Task.id)).where(Task.story_id == story_id)
        return self._session.execute(stmt).scalar_one()
