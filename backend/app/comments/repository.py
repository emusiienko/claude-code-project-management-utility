import uuid

from sqlalchemy import and_, func, or_, select

from app.comments.model import Comment
from app.core.database.json_utils import (
    apply_json_array_filter,
    apply_json_scalar_array_contains_filter,
)
from app.core.database.repository import BaseRepository
from app.core.errors import NotFoundError

_COMMENT_TABLE_ALIAS = "comment"


class CommentRepository(BaseRepository[Comment]):
    model_class = Comment

    def coerce_container_id(self, container_id: str | uuid.UUID) -> uuid.UUID:
        # Exposed so the service can get a validated UUID for model construction
        # without UUID parsing outside the data layer (ADR-011).
        return self._coerce_uuid(container_id, "Container")

    def coerce_comment_id(self, comment_id: str | uuid.UUID) -> uuid.UUID:
        # Exposed so the service can coerce a raw `after_id`/`descendant_of`
        # query-filter id (a comment id, not a container id) without UUID
        # parsing outside the data layer (ADR-011).
        return self._coerce_uuid(comment_id, "Comment")

    def list_paginated(
        self,
        container_type: str,
        container_id: uuid.UUID,
        limit: int,
        offset: int,
        label_key_filter: str | None = None,
        label_value_filter: str | None = None,
        descendant_of_filter: uuid.UUID | None = None,
        after_id_filter: uuid.UUID | None = None,
    ) -> tuple[list[Comment], int]:
        base_stmt = select(Comment).where(
            Comment.container_type == container_type,
            Comment.container_id == container_id,
        )

        if label_key_filter is not None or label_value_filter is not None:
            base_stmt = apply_json_array_filter(
                base_stmt,
                self._session,
                _COMMENT_TABLE_ALIAS,
                label_key_filter,
                label_value_filter,
            )

        if descendant_of_filter is not None:
            base_stmt = apply_json_scalar_array_contains_filter(
                base_stmt,
                self._session,
                _COMMENT_TABLE_ALIAS,
                "ancestors",
                str(descendant_of_filter),
            )

        if after_id_filter is not None:
            # Resolve the watermark comment's (created_at, id) keyset position
            # within this same container — a missing watermark surfaces as
            # NOT_FOUND (404), mirroring the precedent in settings/repository.py.
            anchor_stmt = select(Comment.created_at, Comment.id).where(
                Comment.container_type == container_type,
                Comment.container_id == container_id,
                Comment.id == after_id_filter,
            )
            anchor = self._session.execute(anchor_stmt).first()
            if anchor is None:
                raise NotFoundError(f"Comment '{after_id_filter}' not found.")
            anchor_created_at, anchor_id = anchor
            base_stmt = base_stmt.where(
                or_(
                    Comment.created_at > anchor_created_at,
                    and_(
                        Comment.created_at == anchor_created_at,
                        Comment.id > anchor_id,
                    ),
                )
            )

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = self._session.execute(count_stmt).scalar_one()

        rows_stmt = (
            base_stmt.order_by(Comment.created_at.asc(), Comment.id.asc())
            .limit(limit)
            .offset(offset)
        )
        rows = list(self._session.scalars(rows_stmt).all())
        return rows, total

    def list_by_ids(self, ids: list[uuid.UUID]) -> list[Comment]:
        # Ordered fetch of a set of comment ids in a single query — powers
        # ancestor-chain traversal without recursion. A missing id (e.g. a
        # deleted ancestor) is silently skipped: ancestor ids are FK-less and
        # readers degrade gracefully.
        if not ids:
            return []
        stmt = select(Comment).where(Comment.id.in_(ids))
        rows_by_id = {row.id: row for row in self._session.scalars(stmt).all()}
        return [rows_by_id[i] for i in ids if i in rows_by_id]

    def list_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> list[Comment]:
        # Enumerates every comment on a container — used both ahead of a
        # cascade delete and to compose a detail view's oldest-first
        # `comments` list, hence the explicit chronological ordering.
        stmt = (
            select(Comment)
            .where(
                Comment.container_type == container_type,
                Comment.container_id == container_id,
            )
            .order_by(Comment.created_at.asc(), Comment.id.asc())
        )
        return list(self._session.scalars(stmt).all())

    def delete_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> None:
        # Removes every comment row on a container. Called explicitly on
        # container delete — container_id has no FK, so there is no CASCADE
        # to rely on for either dialect.
        stmt = select(Comment).where(
            Comment.container_type == container_type,
            Comment.container_id == container_id,
        )
        rows = list(self._session.scalars(stmt).all())
        for row in rows:
            self._session.delete(row)
        if rows:
            self._session.flush()
