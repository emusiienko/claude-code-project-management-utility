import datetime
import uuid

from sqlalchemy import Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UTCDateTime, UUIDType


class Attachment(Base):
    __tablename__ = "attachment"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    # container_id is polymorphic across story/task/milestone — it carries no
    # foreign key. Container existence is validated in the service layer, and
    # container-delete cascade is application-level (no DB FK to rely on).
    container_type: Mapped[str] = mapped_column(String(20), nullable=False)
    container_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Server-internal relative path on the attachments volume — never serialized.
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    external_status: Mapped[str | None] = mapped_column(String(200), nullable=True)
    author_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "ix_attachment_container_kind",
            "container_type",
            "container_id",
            "kind",
        ),
    )
