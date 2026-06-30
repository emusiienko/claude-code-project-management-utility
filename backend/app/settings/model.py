import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UUIDType


class SystemSettings(Base):
    __tablename__ = "system_settings"

    # key is the PK — one row per dictionary key (e.g. "task_statuses")
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    values: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class ProjectSettings(Base):
    __tablename__ = "project_settings"

    # Composite PK: one row per (project_id, key)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("project.id", ondelete="CASCADE"),
        primary_key=True,
    )
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    values: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
