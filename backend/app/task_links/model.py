import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UUIDType


class TaskLink(Base):
    __tablename__ = "task_link"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    source_task_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("task.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_task_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("task.id", ondelete="CASCADE"),
        nullable=False,
    )
    link_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    __table_args__ = (
        # Enforce uniqueness of (source, target, link_type) triples.
        UniqueConstraint(
            "source_task_id",
            "target_task_id",
            "link_type",
            name="uq_task_link_source_target_type",
        ),
        # Speed up list queries: all links where a given task is the source.
        Index("ix_task_link_source", "source_task_id"),
        # Speed up list queries: all links where a given task is the target.
        Index("ix_task_link_target", "target_task_id"),
    )
