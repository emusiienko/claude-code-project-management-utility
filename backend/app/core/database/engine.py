from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine


def _enable_wal_mode(dbapi_connection: object, _connection_record: object) -> None:
    # SQLite WAL mode allows concurrent reads alongside writes; required by the
    # >=5 concurrent request target. This is a no-op on non-SQLite connections.
    cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


def build_engine(database_url: str) -> Engine:
    engine = create_engine(
        database_url,
        echo=False,
    )

    if engine.dialect.name == "sqlite":
        event.listen(engine, "connect", _enable_wal_mode)

    return engine
