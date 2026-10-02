import datetime
import uuid

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UTCDateTime, UUIDType


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
    # Fixed 3-value lifecycle enum: pending | in-progress | finished, validated
    # at the schema layer — deliberately not dictionary-validated, unlike
    # task_statuses/story_statuses (STORY-009 TASK-008). The service assigns
    # the default "pending" on create; the DB server_default covers any
    # direct SQL inserts.
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    participant_role: Mapped[str] = mapped_column(String(200), nullable=False)
    result_decisions: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
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
        UTCDateTime(), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )

    __table_args__ = (
        # Backs the project-scoped newest-first default list.
        Index("ix_session_project_created", "project_id", "created_at"),
        # Backs the project-scoped incomplete query (status != finished).
        Index("ix_session_project_status", "project_id", "status"),
        # Backs the linked-story filter and the reference-clearing update.
        Index("ix_session_linked_story", "linked_story_id"),
        # Backs the reference-clearing update on task delete.
        Index("ix_session_linked_task", "linked_task_id"),
    )
