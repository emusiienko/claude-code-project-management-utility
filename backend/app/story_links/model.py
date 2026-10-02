import datetime
import uuid

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UTCDateTime, UUIDType


class StoryLink(Base):
    __tablename__ = "story_link"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    source_story_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("story.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_story_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("story.id", ondelete="CASCADE"),
        nullable=False,
    )
    link_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )

    __table_args__ = (
        # Enforce uniqueness of (source, target, link_type) triples.
        UniqueConstraint(
            "source_story_id",
            "target_story_id",
            "link_type",
            name="uq_story_link_source_target_type",
        ),
        # Speed up list queries: all links where a given story is the source.
        Index("ix_story_link_source", "source_story_id"),
        # Speed up list queries: all links where a given story is the target.
        Index("ix_story_link_target", "target_story_id"),
    )
