import datetime
import uuid

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UUIDType


class Task(Base):
    __tablename__ = "task"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("story.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(100), nullable=False)
    assignee_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    creator_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    labels: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_task_story_status", "story_id", "status"),
        Index("ix_task_story_type", "story_id", "type"),
        Index("ix_task_assignee_role", "assignee_role"),
        Index("ix_task_creator_role", "creator_role"),
    )
