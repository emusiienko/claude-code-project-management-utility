import datetime
import uuid
from typing import Any

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UTCDateTime, UUIDType


class SystemSettings(Base):
    __tablename__ = "system_settings"

    # key is the PK — one row per dictionary key (e.g. "task_statuses")
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    # Any because the JSON shape varies by key: link_types stores structured dicts,
    # the four plain dictionaries store a list of strings, and the scalar
    # default_web_ui_role setting stores a bare string.
    values: Mapped[Any] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
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
    # Any because the JSON shape varies by key: link_types stores structured dicts,
    # the four plain dictionaries store a list of strings, and the scalar
    # default_web_ui_role setting stores a bare string.
    values: Mapped[Any] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )
