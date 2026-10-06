import datetime
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UTCDateTime, UUIDType


class Attachment(Base):
    __tablename__ = "attachment"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    # Exactly one of the three container keys is set (ck_attachment_one_container);
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
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Server-internal relative path on the attachments volume — never serialized.
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    external_status: Mapped[str | None] = mapped_column(String(200), nullable=True)
    author_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
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
            name="ck_attachment_one_container",
        ),
        Index("ix_attachment_story_kind", "story_id", "kind"),
        Index("ix_attachment_task_kind", "task_id", "kind"),
        Index("ix_attachment_milestone_kind", "milestone_id", "kind"),
    )
