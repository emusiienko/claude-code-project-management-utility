import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UUIDType


class Milestone(Base):
    __tablename__ = "milestone"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Lowercase wire values: planned | active | finished (v1.2).
    # The service assigns the default "planned" on create; the DB server_default
    # in the migration covers any direct SQL inserts.
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="planned"
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
