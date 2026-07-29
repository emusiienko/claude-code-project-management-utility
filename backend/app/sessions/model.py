import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UUIDType


class Session(Base):
    __tablename__ = "session"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    topic: Mapped[str] = mapped_column(String(500), nullable=False)
    goal: Mapped[str] = mapped_column(String(500), nullable=False)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(String(200), nullable=True)
    participant_role: Mapped[str] = mapped_column(String(200), nullable=False)
    result_decisions: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_complete: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    linked_story_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType,
        ForeignKey("story.id", ondelete="SET NULL"),
        nullable=True,
    )
    linked_task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType,
        ForeignKey("task.id", ondelete="SET NULL"),
        nullable=True,
    )
    archived_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    __table_args__ = (
        # Backs the project-scoped newest-first default list.
        Index("ix_session_project_created", "project_id", "created_at"),
        # Backs the project-scoped incomplete query.
        Index("ix_session_project_complete", "project_id", "is_complete"),
        # Backs the linked-story filter and the reference-clearing update.
        Index("ix_session_linked_story", "linked_story_id"),
        # Backs the reference-clearing update on task delete.
        Index("ix_session_linked_task", "linked_task_id"),
    )
