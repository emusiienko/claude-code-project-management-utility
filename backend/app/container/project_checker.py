import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session


class SqlProjectChecker:
    # Concrete implementation of the ProjectChecker Protocol defined in
    # app.settings.service.  Queries the project table directly so the
    # settings domain has no import-time dependency on the project domain
    # (which is built in STORY-003).
    #
    # Lives in container/ — the only package permitted to cross domain
    # boundaries — rather than in app/settings/ to keep the settings package
    # self-contained and free of forward dependencies.
    #
    # Uses a dialect-neutral text query with a string UUID parameter.
    # Both SQLite (CHAR(36)) and PostgreSQL (native UUID) accept the
    # string representation without explicit casting.

    def __init__(self, session: Session) -> None:
        self._session = session

    def exists(self, project_id: uuid.UUID) -> bool:
        stmt = text("SELECT EXISTS(SELECT 1 FROM project WHERE id = :id)")
        result = self._session.execute(stmt, {"id": str(project_id)})
        return bool(result.scalar())
