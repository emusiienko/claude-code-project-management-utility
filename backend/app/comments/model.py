import datetime
import uuid

from sqlalchemy import JSON, CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.comments.schema import CONTAINER_MILESTONE, CONTAINER_STORY, CONTAINER_TASK
from app.core.database.base import Base
from app.core.database.types import UTCDateTime, UUIDType


class Comment(Base):
    __tablename__ = "comment"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    # Exactly one of the three container keys is set (ck_comment_one_container);
    # the database removes the row when its container is deleted.
    story_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType,
        ForeignKey("story.id", ondelete="CASCADE"),
        nullable=True,
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType,
        ForeignKey("task.id", ondelete="CASCADE"),
        nullable=True,
    )
    milestone_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType,
        ForeignKey("milestone.id", ondelete="CASCADE"),
        nullable=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author_role: Mapped[str] = mapped_column(String(200), nullable=False)
    labels: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Ordered (root-first) ancestor comment ids — the materialized path
    # backing replies. Immutable once set at create. Kept FK-less on
    # purpose (ADR-023): a reference to a later-deleted ancestor lingers
    # benignly and readers degrade gracefully.
    ancestors: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "(story_id IS NOT NULL AND task_id IS NULL AND milestone_id IS NULL)"
            " OR (story_id IS NULL AND task_id IS NOT NULL AND milestone_id IS NULL)"
            " OR (story_id IS NULL AND task_id IS NULL AND milestone_id IS NOT NULL)",
            name="ck_comment_one_container",
        ),
        Index("ix_comment_story_created", "story_id", "created_at"),
        Index("ix_comment_task_created", "task_id", "created_at"),
        Index("ix_comment_milestone_created", "milestone_id", "created_at"),
    )

    # Derived so the response schema keeps its container_type / container_id shape.
    @property
    def container_type(self) -> str:
        if self.story_id is not None:
            return CONTAINER_STORY
        if self.task_id is not None:
            return CONTAINER_TASK
        return CONTAINER_MILESTONE

    @property
    def container_id(self) -> uuid.UUID:
        container_id = self.story_id or self.task_id or self.milestone_id
        assert container_id is not None
        return container_id
