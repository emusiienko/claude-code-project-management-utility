from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine


def _configure_sqlite_connection(
    dbapi_connection: object, _connection_record: object
) -> None:
    # WAL allows concurrent reads alongside writes; required by the >=5 concurrent
    # request target. SQLite also ignores declared FK actions (ON DELETE CASCADE /
    # SET NULL) unless foreign_keys is ON, and the pragma is per-connection, so it
    # is issued here for every pooled connection.
    cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def _disable_foreign_keys(dbapi_connection: object, _connection_record: object) -> None:
    cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
    cursor.execute("PRAGMA foreign_keys=OFF")
    cursor.close()


def disable_sqlite_foreign_keys(engine: Engine) -> None:
    """Turn FK enforcement off for every connection of a SQLite engine.

    For the migrations environment: SQLite table rebuilds (batch_alter_table)
    drop and recreate parent tables, which would cascade into child rows with
    enforcement on. The pragma is a no-op inside an open transaction, so it must
    be issued from a `connect` listener, never from a session or migration script.
    No-op on other dialects.
    """
    if engine.dialect.name == "sqlite":
        event.listen(engine, "connect", _disable_foreign_keys)


def build_engine(database_url: str) -> Engine:
    engine = create_engine(
        database_url,
        echo=False,
    )

    if engine.dialect.name == "sqlite":
        event.listen(engine, "connect", _configure_sqlite_connection)

    return engine
