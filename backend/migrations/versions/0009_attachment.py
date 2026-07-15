"""Create attachment table.

Revision ID: 0009_attachment
Revises: 0008_link_types_structured
Create Date: 2026-07-14

attachment is a polymorphic association across story/task/milestone via a
(container_type, container_id) pair. container_id carries NO foreign key —
it cannot reference three different tables with one FK — so container
existence is validated in the service layer, and container-delete cascade is
application-level (STORY-007 plan; extends the ADR-018 app-cascade precedent
to a no-FK polymorphic case).

Attachments are immutable and never archived: there is no archived_at column
and no version-history table. No seed data.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_attachment"
down_revision: Union[str, None] = "0008_link_types_structured"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "attachment",
        # id and container_id use String(36) DDL so the migration runs on both
        # SQLite and PostgreSQL without dialect branching (matches UUIDType).
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("container_type", sa.String(20), nullable=False),
        sa.Column("container_id", sa.String(36), nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("mime_type", sa.String(255), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("external_url", sa.String(2000), nullable=True),
        sa.Column("external_status", sa.String(200), nullable=True),
        sa.Column("author_role", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        # No ForeignKeyConstraint on container_id — polymorphic reference.
    )

    # Supports listing a container's attachments filtered by type — the
    # primary read pattern for the Attachments section on every host screen.
    op.create_index(
        "ix_attachment_container_type",
        "attachment",
        ["container_type", "container_id", "type"],
    )


def downgrade() -> None:
    op.drop_index("ix_attachment_container_type", table_name="attachment")
    op.drop_table("attachment")
