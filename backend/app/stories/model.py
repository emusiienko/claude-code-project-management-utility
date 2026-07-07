import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UUIDType


class Story(Base):
    __tablename__ = "story"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    labels: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # milestone_id is intentionally stored without a DB-level FK constraint.
    # The milestone table does not exist until STORY-012; under ADR-010's
    # root-first inline-FK rule the constraint can only be added once that
    # parent table exists. STORY-012 will add the constraint in its own
    # migration via batch_alter_table on SQLite.
    milestone_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
