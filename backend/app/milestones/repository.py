import uuid

from sqlalchemy import func, select

from app.core.database.repository import BaseRepository
from app.milestones.model import Milestone
from app.milestones.schema import MILESTONE_STATUS_ACTIVE
from app.stories.model import Story


class MilestoneRepository(BaseRepository[Milestone]):
    model_class = Milestone

    def coerce_project_id(self, project_id: str | uuid.UUID) -> uuid.UUID:
        return self._coerce_uuid(project_id, "Project")

    def coerce_milestone_id(self, milestone_id: str | uuid.UUID) -> uuid.UUID:
        return self._coerce_uuid(milestone_id, "Milestone")

    def get_name_conflict(
        self,
        name: str,
        project_id: uuid.UUID,
        exclude_id: uuid.UUID | None = None,
    ) -> Milestone | None:
        # Returns a milestone in the same project whose lowercased name matches,
        # optionally excluding a specific milestone (allows rename to the same name).
        stmt = select(Milestone).where(
            Milestone.project_id == project_id,
            func.lower(Milestone.name) == name.lower(),
        )
        if exclude_id is not None:
            stmt = stmt.where(Milestone.id != exclude_id)
        return self._session.scalars(stmt).first()

    def get_active_for_project(
        self, project_id: uuid.UUID
    ) -> Milestone | None:
        # Returns the single active milestone for a project, or None.
        # The service relies on the "at most one active" invariant it maintains.
        stmt = select(Milestone).where(
            Milestone.project_id == project_id,
            Milestone.status == MILESTONE_STATUS_ACTIVE,
        )
        return self._session.scalars(stmt).first()

    def list_paginated(
        self,
        limit: int,
        offset: int,
        project_id: uuid.UUID | None = None,
    ) -> tuple[list[Milestone], int]:
        base_stmt = select(Milestone)

        if project_id is not None:
            base_stmt = base_stmt.where(Milestone.project_id == project_id)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = self._session.execute(count_stmt).scalar_one()

        rows_stmt = (
            base_stmt
            .order_by(Milestone.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        rows = list(self._session.scalars(rows_stmt).all())
        return rows, total

    def get_story_counts(
        self, milestone_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, int]:
        # Resolves story counts for a batch of milestones in a single grouped
        # query — avoids an N+1 per-milestone query on the list endpoint.
        if not milestone_ids:
            return {}
        stmt = (
            select(Story.milestone_id, func.count(Story.id))
            .where(Story.milestone_id.in_(milestone_ids))
            .group_by(Story.milestone_id)
        )
        rows = self._session.execute(stmt).all()
        return {row[0]: row[1] for row in rows}

    def get_story_count(self, milestone_id: uuid.UUID) -> int:
        # Counts stories assigned to a single milestone (used on the detail
        # endpoint where the batch variant would be wasteful).
        stmt = (
            select(func.count(Story.id))
            .where(Story.milestone_id == milestone_id)
        )
        return self._session.execute(stmt).scalar_one()

    def clear_story_links(self, milestone_id: uuid.UUID) -> None:
        # Sets milestone_id = NULL on all stories assigned to the milestone.
        # Called before the milestone is deleted so no orphaned FK references remain.
        from sqlalchemy import update

        stmt = (
            update(Story)
            .where(Story.milestone_id == milestone_id)
            .values(milestone_id=None)
        )
        self._session.execute(stmt)
