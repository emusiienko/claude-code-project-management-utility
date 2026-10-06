import logging
import time
from collections.abc import Callable

from app.core.storage.filesystem import FilesystemStorage

logger = logging.getLogger(__name__)

# Longer than any create request: a file written by a create that has not
# committed its row yet must not be taken for an orphan.
DEFAULT_GRACE_WINDOW_SECONDS = 3600.0


class OrphanFileSweeper:
    """Deletes stored files that no attachment row references."""

    def __init__(
        self,
        storage: FilesystemStorage,
        referenced_paths: Callable[[], set[str]],
        grace_window_seconds: float = DEFAULT_GRACE_WINDOW_SECONDS,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._storage = storage
        self._referenced_paths = referenced_paths
        self._grace_window_seconds = grace_window_seconds
        self._clock = clock

    def sweep(self, honor_grace_window: bool = True) -> None:
        try:
            referenced = self._referenced_paths()
            threshold = self._clock() - self._grace_window_seconds
            for stored in self._storage.list_files():
                if stored.relative_path in referenced:
                    continue
                if honor_grace_window and stored.modified_at > threshold:
                    continue
                self._delete_quietly(stored.relative_path)
        except Exception:
            # A sweep never fails its caller; the next sweep catches up.
            logger.exception("Orphan file sweep failed")

    def _delete_quietly(self, relative_path: str) -> None:
        try:
            self._storage.delete(relative_path)
        except Exception:
            logger.exception("Could not delete orphan file '%s'", relative_path)
