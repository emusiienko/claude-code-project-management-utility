"""Create project table and seed one default project.

Revision ID: 0001_project
Revises:
Create Date: 2026-06-30

project is the root entity. It is created first so that every later migration
can declare FK constraints toward it inline — no deferred FK or batch_alter_table
is ever needed.

The seed row is inserted in the same upgrade() so a brand-new database is
immediately usable. Timestamps are fixed (not now()) to keep the migration
deterministic and re-runnable.
"""

from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_project"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Fixed seed values — defined once here; downgrade can target this exact row.
_SEED_PROJECT_ID = "00000000-0000-0000-0000-000000000001"
_SEED_TIMESTAMP = datetime(2026, 6, 30, 0, 0, 0, tzinfo=timezone.utc)


def upgrade() -> None:
    op.create_table(
        "project",
        # project_id uses String(36) DDL so the same migration runs on both
        # SQLite (no native UUID type) and PostgreSQL. The UUIDType custom
        # column type in app/core/database/types.py handles dialect-aware
        # conversion at the ORM layer.
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Case-insensitive unique index on name. op.create_index with func.lower()
    # produces a functional index on both PostgreSQL and SQLite 3.38+.
    op.create_index(
        "ix_project_name_lower",
        "project",
        [sa.text("LOWER(name)")],
        unique=True,
    )

    project_table = sa.table(
        "project",
        sa.column("id", sa.String),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    op.bulk_insert(
        project_table,
        [
            {
                "id": _SEED_PROJECT_ID,
                "name": "Test Project",
                "description": (
                    "Seed project created by migration 0001 for first-run usability."
                ),
                "created_at": _SEED_TIMESTAMP,
                "updated_at": _SEED_TIMESTAMP,
            }
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_project_name_lower", table_name="project")
    op.drop_table("project")
