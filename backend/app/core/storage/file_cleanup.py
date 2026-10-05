from sqlalchemy.orm import Session

from app.core.database import run_after_commit
from app.core.storage.filesystem import FilesystemStorage
from app.core.storage.orphan_sweeper import OrphanFileSweeper


class FileCleanupRequester:
    """Request-scoped: records stored-file removal to run after the request's
    session commits, and drops it if the transaction rolls back."""

    def __init__(
        self,
        session: Session,
        sweeper: OrphanFileSweeper,
        storage: FilesystemStorage,
    ) -> None:
        self._session = session
        self._sweeper = sweeper
        self._storage = storage

    def request_sweep(self) -> None:
        run_after_commit(self._session, self._sweeper.sweep)

    def request_delete(self, relative_path: str) -> None:
        run_after_commit(self._session, lambda: self._storage.delete(relative_path))
