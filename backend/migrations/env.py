import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Ensure the backend package is importable when running alembic from any CWD.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Import all models here so their metadata is registered on Base before
# Alembic autogenerates migrations. Add each new domain model import here
# as it is implemented.
from app.attachments.model import Attachment  # noqa: F401
from app.comments.model import Comment  # noqa: F401
from app.config import settings
from app.core.database.base import Base
from app.core.database.engine import disable_sqlite_foreign_keys
from app.milestones.model import Milestone  # noqa: F401
from app.projects.model import Project  # noqa: F401
from app.sessions.model import Session  # noqa: F401
from app.settings.model import ProjectSettings, SystemSettings  # noqa: F401
from app.stories.model import Story  # noqa: F401
from app.story_links.model import StoryLink  # noqa: F401
from app.task_links.model import TaskLink  # noqa: F401
from app.tasks.model import Task  # noqa: F401

config = context.config

# Allow an externally configured URL (e.g. for integration tests) to take
# precedence over the application default. alembic.ini ships with a blank
# placeholder, so an empty string means "not configured externally".
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    # SQLite table rebuilds must run with FK enforcement off (see ADR-001).
    disable_sqlite_foreign_keys(connectable)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
