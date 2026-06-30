import shutil
import uuid
from pathlib import Path

from app.core.errors import InternalError


class FilesystemStorage:
    # Manages attachment file I/O on the local filesystem.
    # All paths are server-internal; they are never serialized to API responses.

    def __init__(self, base_dir: str) -> None:
        self._base = Path(base_dir)

    def _resolve(self, relative_path: str) -> Path:
        return self._base / relative_path

    def write(self, content: bytes, relative_path: str) -> None:
        destination = self._resolve(relative_path)
        try:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
        except OSError as exc:
            raise InternalError(f"Failed to write file: {exc}") from exc

    def read(self, relative_path: str) -> bytes:
        path = self._resolve(relative_path)
        try:
            return path.read_bytes()
        except FileNotFoundError as exc:
            raise InternalError(f"File not found: {relative_path}") from exc
        except OSError as exc:
            raise InternalError(f"Failed to read file: {exc}") from exc

    def snapshot(self, source_relative: str) -> str:
        # Creates an immutable copy of the source file for version history.
        # Returns the relative path of the new snapshot.
        source = self._resolve(source_relative)
        snapshot_relative = f"versions/{uuid.uuid4()}/{source.name}"
        destination = self._resolve(snapshot_relative)
        try:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(source), str(destination))
        except OSError as exc:
            raise InternalError(f"Failed to create snapshot: {exc}") from exc
        return snapshot_relative
