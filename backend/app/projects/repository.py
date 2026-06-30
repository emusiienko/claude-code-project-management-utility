import uuid

from sqlalchemy import func, select

from app.core.database.repository import BaseRepository
from app.projects.model import Project


class ProjectRepository(BaseRepository[Project]):
    model_class = Project

    def get_by_name_lower(self, name: str) -> Project | None:
        # Case-insensitive lookup used by the service to enforce unique names
        # without relying on the DB index alone (works on both dialects).
        stmt = select(Project).where(func.lower(Project.name) == name.lower())
        return self._session.scalars(stmt).first()

    def list_paginated(
        self,
        limit: int,
        offset: int,
    ) -> tuple[list[Project], int]:
        count_stmt = select(func.count()).select_from(Project)
        total = self._session.execute(count_stmt).scalar_one()

        rows_stmt = (
            select(Project)
            .order_by(Project.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        rows = list(self._session.scalars(rows_stmt).all())
        return rows, total

    def get_name_conflict(
        self,
        name: str,
        exclude_id: uuid.UUID | None = None,
    ) -> Project | None:
        # Returns a project whose lowercased name matches, optionally excluding
        # a specific project (used on update to allow a project to keep its own name).
        stmt = select(Project).where(func.lower(Project.name) == name.lower())
        if exclude_id is not None:
            stmt = stmt.where(Project.id != exclude_id)
        return self._session.scalars(stmt).first()
