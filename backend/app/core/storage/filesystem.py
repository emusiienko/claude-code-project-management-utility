import shutil
import uuid
from dataclasses import dataclass
from pathlib import Path

from app.core.errors import InternalError


@dataclass(frozen=True)
class StoredFile:
    relative_path: str
    modified_at: float


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

    def delete(self, relative_path: str) -> None:
        # Permanent removal of one stored file, after a commit that removed its row.
        # missing_ok tolerates a file already absent (e.g. a retried delete).
        path = self._resolve(relative_path)
        try:
            path.unlink(missing_ok=True)
        except OSError as exc:
            raise InternalError(f"Failed to delete file: {exc}") from exc

    def list_files(self) -> list[StoredFile]:
        # Every stored file, as a path relative to the base directory plus its
        # modification time (epoch seconds). A missing base directory is empty.
        if not self._base.is_dir():
            return []
        files: list[StoredFile] = []
        for path in self._base.rglob("*"):
            try:
                if path.is_file():
                    files.append(
                        StoredFile(
                            relative_path=path.relative_to(self._base).as_posix(),
                            modified_at=path.stat().st_mtime,
                        )
                    )
            except FileNotFoundError:
                continue  # removed between the directory walk and the stat
        return files

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
