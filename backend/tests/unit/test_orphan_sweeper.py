"""Unit tests for the orphan file sweep and FilesystemStorage.list_files."""

from __future__ import annotations

import logging
import os
from pathlib import Path

import pytest

from app.core.storage import FilesystemStorage, OrphanFileSweeper

LOGGER = logging.getLogger("app.core.storage.orphan_sweeper")

NOW = 1_000_000.0
WINDOW = 3600.0
OLD = NOW - WINDOW - 10
YOUNG = NOW - 10


@pytest.fixture(autouse=True)
def _enable_logger(monkeypatch: pytest.MonkeyPatch) -> None:
    # migrations/env.py runs logging.fileConfig, which disables loggers created
    # before it ran; re-enable this one so caplog can see it.
    monkeypatch.setattr(LOGGER, "disabled", False)


@pytest.fixture
def storage(tmp_path: Path) -> FilesystemStorage:
    return FilesystemStorage(str(tmp_path / "files"))


def _put(storage: FilesystemStorage, relative_path: str, modified_at: float) -> Path:
    storage.write(b"x", relative_path)
    path = Path(storage._base) / relative_path
    os.utime(path, (modified_at, modified_at))
    return path


def _sweeper(
    storage: FilesystemStorage, referenced: set[str] | Exception
) -> OrphanFileSweeper:
    def reader() -> set[str]:
        if isinstance(referenced, Exception):
            raise referenced
        return referenced

    return OrphanFileSweeper(
        storage, reader, grace_window_seconds=WINDOW, clock=lambda: NOW
    )


def test_list_files_returns_relative_paths_with_mtime(
    storage: FilesystemStorage,
) -> None:
    _put(storage, "story/s1/a1", OLD)
    _put(storage, "task/t1/a2", YOUNG)

    listed = {f.relative_path: f.modified_at for f in storage.list_files()}

    assert listed == {"story/s1/a1": OLD, "task/t1/a2": YOUNG}


def test_list_files_on_missing_base_dir_is_empty(tmp_path: Path) -> None:
    assert FilesystemStorage(str(tmp_path / "absent")).list_files() == []


def test_referenced_file_is_kept(storage: FilesystemStorage) -> None:
    path = _put(storage, "story/s1/a1", OLD)

    _sweeper(storage, {"story/s1/a1"}).sweep()

    assert path.exists()


def test_old_unreferenced_file_is_removed(storage: FilesystemStorage) -> None:
    path = _put(storage, "story/s1/a1", OLD)

    _sweeper(storage, set()).sweep()

    assert not path.exists()


def test_young_unreferenced_file_survives_windowed_sweep_only(
    storage: FilesystemStorage,
) -> None:
    path = _put(storage, "story/s1/a1", YOUNG)
    sweeper = _sweeper(storage, set())

    sweeper.sweep()
    assert path.exists(), "A windowed sweep must skip a file inside the grace window"

    sweeper.sweep(honor_grace_window=False)
    assert not path.exists(), "A sweep with no window removes it"


def test_failed_referenced_read_is_logged_and_swallowed(
    storage: FilesystemStorage, caplog: pytest.LogCaptureFixture
) -> None:
    path = _put(storage, "story/s1/a1", OLD)

    _sweeper(storage, RuntimeError("db down")).sweep()

    assert path.exists(), "Nothing may be deleted when the referenced set is unknown"
    assert "Orphan file sweep failed" in caplog.text


def test_undeletable_file_is_logged_and_does_not_stop_the_rest(
    storage: FilesystemStorage,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    stuck = _put(storage, "story/s1/stuck", OLD)
    other = _put(storage, "story/s1/other", OLD)
    real_delete = storage.delete

    def delete(relative_path: str) -> None:
        if relative_path.endswith("stuck"):
            raise OSError("permission denied")
        real_delete(relative_path)

    monkeypatch.setattr(storage, "delete", delete)

    _sweeper(storage, set()).sweep()

    assert stuck.exists()
    assert not other.exists()
    assert "Could not delete orphan file" in caplog.text
