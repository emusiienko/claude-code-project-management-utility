import datetime
import uuid

from sqlalchemy import JSON, DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.types import UUIDType


class Comment(Base):
    __tablename__ = "comment"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    # container_id is polymorphic across story/task/milestone — it carries no
    # foreign key, mirroring the attachment container convention. Container
    # existence is validated in the service layer, and container-delete
    # cascade is application-level (no DB FK to rely on).
    container_type: Mapped[str] = mapped_column(String(20), nullable=False)
    container_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author_role: Mapped[str] = mapped_column(String(200), nullable=False)
    labels: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Ordered (root-first) ancestor comment ids — the materialized path
    # backing replies. Immutable once set at create. Held FK-less like
    # container_id: referential integrity of ancestor ids is not
    # DB-enforced, so a reference to a later-deleted ancestor lingers
    # benignly and readers degrade gracefully.
    ancestors: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "ix_comment_container_created",
            "container_type",
            "container_id",
            "created_at",
        ),
    )
