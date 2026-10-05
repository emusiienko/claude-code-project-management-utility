import datetime
import uuid

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UTCDateTime, UUIDType


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
    milestone_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType,
        ForeignKey("milestone.id", ondelete="SET NULL", name="fk_story_milestone_id"),
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )
