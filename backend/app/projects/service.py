import datetime
import uuid

from app.core.errors import ConflictError, NotFoundError
from app.projects.model import Project
from app.projects.repository import ProjectRepository

_NAME_CONFLICT_MSG = "A project with this name already exists."

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


class ProjectService:
    def __init__(self, repo: ProjectRepository) -> None:
        self._repo = repo

    def create(
        self,
        name: str,
        description: str | None,
    ) -> Project:
        # Field-level validation (length, non-empty) is enforced by the Pydantic
        # schema before reaching this layer; only business-rule validation lives here.
        self._assert_name_unique(name, exclude_id=None)

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        project = Project(
            id=uuid.uuid4(),
            name=name,
            description=description,
            created_at=now,
            updated_at=now,
        )
        return self._repo.save(project)

    def get(self, project_id: str) -> Project:
        project = self._repo.get_by_id(project_id)
        if project is None:
            raise NotFoundError(f"Project '{project_id}' not found.")
        return project

    def list_paginated(
        self,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
    ) -> tuple[list[Project], int]:
        # Clamp limit to the contract maximum; never raise on an out-of-range value
        # because the controller validates first — this is a safety floor only.
        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit
        return self._repo.list_paginated(effective_limit, offset)

    def update(
        self,
        project_id: str,
        name: str | None,
        description: str | None,
    ) -> Project:
        project = self.get(project_id)

        if name is not None:
            self._assert_name_unique(name, exclude_id=project.id)
            project.name = name

        if description is not None:
            project.description = description

        project.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
        return self._repo.save(project)

    def delete(self, project_id: str) -> None:
        project = self.get(project_id)
        self._repo.delete(project)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _assert_name_unique(
        self,
        name: str,
        exclude_id: uuid.UUID | None,
    ) -> None:
        conflict = self._repo.get_name_conflict(name, exclude_id=exclude_id)
        if conflict is not None:
            raise ConflictError(_NAME_CONFLICT_MSG)
