"""Stored-file removal after commit, and the startup orphan sweep (ADR-034)."""

from __future__ import annotations

import uuid
from pathlib import Path

from httpx import AsyncClient
from sqlalchemy.orm import Session, sessionmaker

from app.attachments.model import Attachment
from app.attachments.repository import AttachmentRepository
from app.attachments.service import AttachmentService
from app.core.storage import FileCleanupRequester, FilesystemStorage, OrphanFileSweeper

STORIES_URL = "/v1/stories"


async def _create_stored_attachment(
    client: AsyncClient, project_id: str
) -> tuple[str, str]:
    story = await client.post(
        STORIES_URL, json={"project_id": project_id, "title": "Cleanup Story"}
    )
    story_id = story.json()["data"]["id"]
    created = await client.post(
        f"{STORIES_URL}/{story_id}/attachments",
        json={
            "title": "Doc",
            "kind": "document",
            "mime_type": "text/markdown",
            "content": "hello",
        },
    )
    assert created.status_code == 201, created.text
    return story_id, created.json()["data"]["id"]


def _service_on(
    session: Session, attachments_dir: Path
) -> tuple[AttachmentService, Path]:
    storage = FilesystemStorage(str(attachments_dir))
    sweeper = OrphanFileSweeper(storage, lambda: set())
    service = AttachmentService(
        repo=AttachmentRepository(session),
        storage=storage,
        story_reader=None,  # type: ignore[arg-type]
        task_reader=None,  # type: ignore[arg-type]
        milestone_reader=None,  # type: ignore[arg-type]
        file_cleanup=FileCleanupRequester(session, sweeper, storage),
    )
    return service, attachments_dir


async def test_rolled_back_delete_keeps_row_and_file(
    client: AsyncClient,
    create_project,
    session_factory: sessionmaker[Session],
    attachments_dir: Path,
) -> None:
    story_id, attachment_id = await _create_stored_attachment(
        client, create_project("Rollback Delete")
    )
    file_path = attachments_dir / "story" / story_id / attachment_id
    assert file_path.exists()

    session = session_factory()
    try:
        service, _ = _service_on(session, attachments_dir)
        service.delete(attachment_id)
        session.rollback()
    finally:
        session.close()

    assert file_path.exists(), "A rolled-back delete must keep the stored file"
    check = session_factory()
    try:
        assert check.get(Attachment, uuid.UUID(attachment_id)) is not None
    finally:
        check.close()


async def test_committed_delete_removes_file_only_after_commit(
    client: AsyncClient,
    create_project,
    session_factory: sessionmaker[Session],
    attachments_dir: Path,
) -> None:
    story_id, attachment_id = await _create_stored_attachment(
        client, create_project("Commit Delete")
    )
    file_path = attachments_dir / "story" / story_id / attachment_id

    session = session_factory()
    try:
        service, _ = _service_on(session, attachments_dir)
        service.delete(attachment_id)
        assert file_path.exists(), "The file must survive until the commit"
        session.commit()
    finally:
        session.close()

    assert not file_path.exists()


async def test_startup_sweep_removes_orphans_and_keeps_referenced_files(
    client: AsyncClient, create_project, attachments_dir: Path
) -> None:
    from app.main import application

    story_id, attachment_id = await _create_stored_attachment(
        client, create_project("Startup Sweep")
    )
    referenced = attachments_dir / "story" / story_id / attachment_id
    orphan = attachments_dir / "orphans" / "startup-sweep-orphan"
    orphan.parent.mkdir(parents=True, exist_ok=True)
    orphan.write_bytes(b"orphan")  # modified just now: inside any grace window

    async with application.router.lifespan_context(application):
        assert not orphan.exists(), "Startup sweep must ignore the grace window"
        assert referenced.exists(), "Startup sweep must keep referenced files"
