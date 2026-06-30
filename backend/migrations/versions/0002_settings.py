"""Create system_settings and project_settings tables; seed six default dictionaries.

Revision ID: 0002_settings
Revises: 0001_project
Create Date: 2026-06-30

project_settings declares its FK to project inline. This is valid because
0001_project already created the project table — no deferred FK, no batch_alter_table.

Seed data (the six system-default dictionaries) is bundled in the same revision
as the schema it populates. Timestamps are fixed for determinism.
"""

from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_settings"
down_revision: Union[str, None] = "0001_project"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SEED_TIMESTAMP = datetime(2026, 6, 30, 0, 0, 0, tzinfo=timezone.utc)

# Default values are the canonical source from docs/architecture.md §Seed data.
_SEED_ROWS = [
    {
        "key": "task_statuses",
        "values": ["todo", "in-progress", "done"],
    },
    {
        "key": "task_types",
        "values": ["task", "bug", "testing-task"],
    },
    {
        "key": "story_statuses",
        "values": ["planned", "in-progress", "pending-approval", "accepted"],
    },
    {
        "key": "attachment_types",
        "values": [
            "plan",
            "document",
            "image",
            "implementation-report",
            "test-result",
            "external-ref",
        ],
    },
    {
        "key": "link_types",
        "values": ["depends-on", "context"],
    },
    {
        "key": "participant_roles",
        "values": [
            "orchestrator",
            "architect",
            "backend-developer",
            "frontend-developer",
            "devops",
            "spec-writer",
            "qa-automation",
            "manual-qa",
        ],
    },
]


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(50), primary_key=True),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "project_settings",
        # project_id stores UUID portably: CHAR(36) on SQLite, native UUID on
        # PostgreSQL. The UUIDType custom type handles this at the ORM layer;
        # migrations use String(36) so both dialects accept the same DDL.
        sa.Column("project_id", sa.String(36), nullable=False),
        sa.Column("key", sa.String(50), nullable=False),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        # Inline FK — valid because project already exists from 0001_project.
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("project_id", "key"),
    )

    system_settings_table = sa.table(
        "system_settings",
        sa.column("key", sa.String),
        sa.column("values", sa.JSON),
        sa.column("updated_at", sa.DateTime),
    )
    op.bulk_insert(
        system_settings_table,
        [
            {
                "key": row["key"],
                "values": row["values"],
                "updated_at": _SEED_TIMESTAMP,
            }
            for row in _SEED_ROWS
        ],
    )


def downgrade() -> None:
    op.drop_table("project_settings")
    op.drop_table("system_settings")
