import uuid

from sqlalchemy import or_, select

from app.core.database.repository import BaseRepository
from app.task_links.model import TaskLink
from app.tasks.model import Task


class TaskLinkRepository(BaseRepository[TaskLink]):
    model_class = TaskLink

    def coerce_task_id(self, task_id: str | uuid.UUID) -> uuid.UUID:
        return self._coerce_uuid(task_id, "Task")

    def find_duplicate(
        self,
        source_task_id: uuid.UUID,
        target_task_id: uuid.UUID,
        link_type: str,
    ) -> TaskLink | None:
        stmt = select(TaskLink).where(
            TaskLink.source_task_id == source_task_id,
            TaskLink.target_task_id == target_task_id,
            TaskLink.link_type == link_type,
        )
        return self._session.scalars(stmt).first()

    def list_for_task(
        self,
        task_id: uuid.UUID,
        direction: str,
        link_type_filter: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[TaskLink], int]:
        # Build the base query scoped to the direction filter.
        if direction == "outbound":
            direction_clause = TaskLink.source_task_id == task_id
        elif direction == "inbound":
            direction_clause = TaskLink.target_task_id == task_id
        else:
            direction_clause = or_(
                TaskLink.source_task_id == task_id,
                TaskLink.target_task_id == task_id,
            )

        base_stmt = select(TaskLink).where(direction_clause)

        if link_type_filter is not None:
            base_stmt = base_stmt.where(TaskLink.link_type == link_type_filter)

        from sqlalchemy import func

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = self._session.execute(count_stmt).scalar_one()

        rows_stmt = (
            base_stmt.order_by(TaskLink.created_at.asc()).limit(limit).offset(offset)
        )
        rows = list(self._session.scalars(rows_stmt).all())
        return rows, total

    def get_linked_task_summaries(
        self, task_ids: set[uuid.UUID]
    ) -> dict[uuid.UUID, Task]:
        # Batch-load linked task summaries in one query (no N+1).
        # Reads the task table directly through this repository's own session —
        # does not call the tasks service to avoid circular imports.
        if not task_ids:
            return {}
        stmt = select(Task).where(Task.id.in_(task_ids))
        rows = self._session.scalars(stmt).all()
        return {row.id: row for row in rows}

    def delete_all_for_task(self, task_id: uuid.UUID) -> None:
        # Remove every link that references this task (source or target side).
        # Called explicitly on task-delete because SQLite's ON DELETE CASCADE is
        # inert without PRAGMA foreign_keys = ON (Known Divergences).
        stmt = select(TaskLink).where(
            or_(
                TaskLink.source_task_id == task_id,
                TaskLink.target_task_id == task_id,
            )
        )
        links = list(self._session.scalars(stmt).all())
        for link in links:
            self._session.delete(link)
        if links:
            self._session.flush()

    def list_all_for_task(self, task_id: uuid.UUID) -> list[TaskLink]:
        stmt = select(TaskLink).where(
            or_(
                TaskLink.source_task_id == task_id,
                TaskLink.target_task_id == task_id,
            )
        )
        return list(self._session.scalars(stmt).all())
