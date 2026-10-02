import uuid

from sqlalchemy import select, text

from app.core.database.repository import BaseRepository
from app.core.errors import NotFoundError
from app.settings.model import ProjectSettings, SystemSettings


class SystemSettingsRepository(BaseRepository[SystemSettings]):
    model_class = SystemSettings

    def get_by_key(self, key: str) -> SystemSettings | None:
        stmt = select(SystemSettings).where(SystemSettings.key == key)
        return self._session.scalars(stmt).first()


class ProjectSettingsRepository(BaseRepository[ProjectSettings]):
    # A row exists only when a project has set an override for that key.
    model_class = ProjectSettings

    def assert_project_exists(self, project_id: uuid.UUID) -> None:
        # Raw SQL avoids an import-time dependency on the projects domain ORM model.
        # String UUID parameter is accepted by both SQLite (CHAR(36)) and PostgreSQL
        # (native UUID type) without explicit casting.
        stmt = text("SELECT EXISTS(SELECT 1 FROM project WHERE id = :id)")
        exists = bool(self._session.execute(stmt, {"id": str(project_id)}).scalar())
        if not exists:
            raise NotFoundError(f"Project '{project_id}' not found.")

    def get_all_for_project(self, project_id: uuid.UUID) -> list[ProjectSettings]:
        stmt = select(ProjectSettings).where(ProjectSettings.project_id == project_id)
        return list(self._session.scalars(stmt).all())

    def get_by_project_and_key(
        self,
        project_id: uuid.UUID,
        key: str,
    ) -> ProjectSettings | None:
        stmt = select(ProjectSettings).where(
            ProjectSettings.project_id == project_id,
            ProjectSettings.key == key,
        )
        return self._session.scalars(stmt).first()
