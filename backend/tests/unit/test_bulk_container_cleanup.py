"""Unit tests for the bulk container cleanup on the attachment/comment services.

A transitive cascade (story -> tasks, project -> stories/tasks/milestones) must
cost a fixed number of queries per container type, not one per container.
"""

from __future__ import annotations

import datetime
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.attachments.model import Attachment
from app.attachments.repository import AttachmentRepository
from app.attachments.service import AttachmentService
from app.comments.model import Comment
from app.comments.repository import CommentRepository
from app.comments.service import CommentService

NOW = datetime.datetime.now(tz=datetime.timezone.utc)


class RecordingStorage:
    def __init__(self) -> None:
        self.deleted: list[str] = []

    def delete(self, path: str) -> None:
        self.deleted.append(path)


@contextmanager
def _count_statements(session: Session) -> Iterator[list[str]]:
    statements: list[str] = []

    def _record(conn, cursor, statement, parameters, context, executemany) -> None:
        statements.append(statement)

    engine = session.get_bind()
    event.listen(engine, "before_cursor_execute", _record)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", _record)


def _attachment(container_type: str, container_id: uuid.UUID, path: str | None):
    return Attachment(
        id=uuid.uuid4(),
        container_type=container_type,
        container_id=container_id,
        title="t",
        kind="document" if path else "external-ref",
        file_path=path,
        created_at=NOW,
        updated_at=NOW,
    )


def _comment(container_type: str, container_id: uuid.UUID):
    return Comment(
        id=uuid.uuid4(),
        container_type=container_type,
        container_id=container_id,
        content="c",
        author_role="operator",
        labels=[],
        ancestors=[],
        created_at=NOW,
        updated_at=NOW,
    )


def _attachment_service(session: Session, storage: RecordingStorage):
    none = SimpleNamespace()
    return AttachmentService(
        repo=AttachmentRepository(session),
        storage=storage,  # type: ignore[arg-type]
        story_reader=none,  # type: ignore[arg-type]
        task_reader=none,  # type: ignore[arg-type]
        milestone_reader=none,  # type: ignore[arg-type]
    )


def _comment_service(session: Session):
    none = SimpleNamespace()
    return CommentService(
        repo=CommentRepository(session),
        story_reader=none,  # type: ignore[arg-type]
        task_reader=none,  # type: ignore[arg-type]
        milestone_reader=none,  # type: ignore[arg-type]
    )


@pytest.mark.parametrize("container_count", [1, 5])
def test_attachment_bulk_delete_uses_two_queries_and_removes_files_then_rows(
    db_session: Session, container_count: int
) -> None:
    container_ids = [uuid.uuid4() for _ in range(container_count)]
    kept_id = uuid.uuid4()
    db_session.add_all(
        [_attachment("task", cid, f"task/{cid}/file") for cid in container_ids]
        + [_attachment("task", kept_id, f"task/{kept_id}/file")]
        + [_attachment("story", container_ids[0], "story/other/file")]
    )
    db_session.flush()
    storage = RecordingStorage()
    service = _attachment_service(db_session, storage)

    with _count_statements(db_session) as statements:
        service.delete_all_for_containers("task", container_ids)

    assert len(statements) == 2, "one SELECT for the files and one DELETE for the rows"
    assert sorted(storage.deleted) == sorted(
        f"task/{cid}/file" for cid in container_ids
    )
    scope = [*container_ids, kept_id]
    remaining = {
        (a.container_type, a.container_id)
        for a in db_session.query(Attachment)
        .filter(Attachment.container_id.in_(scope))
        .all()
    }
    assert remaining == {("task", kept_id), ("story", container_ids[0])}


def test_comment_bulk_delete_uses_one_query_regardless_of_container_count(
    db_session: Session,
) -> None:
    container_ids = [uuid.uuid4() for _ in range(5)]
    kept_id = uuid.uuid4()
    db_session.add_all(
        [_comment("task", cid) for cid in container_ids]
        + [_comment("task", kept_id), _comment("story", container_ids[0])]
    )
    db_session.flush()
    service = _comment_service(db_session)

    with _count_statements(db_session) as statements:
        service.delete_all_for_containers("task", container_ids)

    assert len(statements) == 1
    scope = [*container_ids, kept_id]
    remaining = {
        (c.container_type, c.container_id)
        for c in db_session.query(Comment).filter(Comment.container_id.in_(scope)).all()
    }
    assert remaining == {("task", kept_id), ("story", container_ids[0])}


def test_bulk_methods_do_nothing_for_an_empty_container_list(
    db_session: Session,
) -> None:
    storage = RecordingStorage()
    attachments = _attachment_service(db_session, storage)
    comments = _comment_service(db_session)

    with _count_statements(db_session) as statements:
        attachments.delete_all_for_containers("task", [])
        comments.delete_all_for_containers("task", [])
        assert CommentRepository(db_session).list_all_for_containers("task", []) == []

    assert statements == []
    assert storage.deleted == []


def test_comment_repository_lists_comments_across_containers(
    db_session: Session,
) -> None:
    first, second, other = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    db_session.add_all(
        [_comment("task", first), _comment("task", second), _comment("task", other)]
    )
    db_session.flush()

    rows = CommentRepository(db_session).list_all_for_containers(
        "task", [first, second]
    )

    assert {row.container_id for row in rows} == {first, second}
