"""Copy local demo data into an empty, migrated PostgreSQL database atomically."""
from pathlib import Path
from datetime import datetime, timezone
import sqlite3

from sqlalchemy import create_engine, MetaData, select, text, func

from backend.vega.presentation import configure_postgresql, ROOT


def migrate():
    target_url = configure_postgresql()
    source_path = ROOT / "tmp" / "presentation" / "vega.db"
    if not source_path.exists():
        raise RuntimeError("Demo SQLite database not found; source data has not been changed.")
    from sqlalchemy.engine import make_url
    from psycopg import connect, sql
    url = make_url(target_url)
    # Create only the explicitly configured local target, never drop an existing DB.
    with connect(host=url.host, port=url.port or 5432, user=url.username,
                 password=url.password, dbname="postgres", connect_timeout=5, autocommit=True) as admin:
        exists = admin.execute("SELECT 1 FROM pg_database WHERE datname = %s", (url.database,)).fetchone()
        if not exists:
            admin.execute(sql.SQL("CREATE DATABASE {} OWNER {}").format(sql.Identifier(url.database), sql.Identifier(url.username)))
    target = create_engine(target_url)
    from backend.vega.models import Base
    # Check access and refuse to overwrite an existing database before doing any work.
    with target.connect() as connection:
        present = connection.execute(text("SELECT to_regclass('public.users')")).scalar()
        if present and connection.execute(text("SELECT count(*) FROM users")).scalar():
            raise RuntimeError("Target already has users. Refusing to overwrite; choose an empty database.")
    from alembic.config import Config
    from alembic import command
    command.upgrade(Config(str(ROOT / "backend" / "alembic.ini")), "head")
    snapshot = source_path.with_name(f"before-postgresql-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}.db")
    with sqlite3.connect(f"file:{source_path.as_posix()}?mode=ro", uri=True) as origin:
        with sqlite3.connect(snapshot) as destination:
            origin.backup(destination)
    source = create_engine("sqlite:///" + source_path.as_posix())
    metadata = MetaData()
    metadata.reflect(source)
    counts = {}
    with source.connect() as origin, target.begin() as destination:
        for table in Base.metadata.sorted_tables:
            if destination.execute(select(func.count()).select_from(table)).scalar():
                raise RuntimeError(f"Target table {table.name} is not empty; copy rolled back.")
            old = metadata.tables.get(table.name)
            records = [dict(row) for row in origin.execute(select(old).order_by(*old.primary_key.columns)).mappings()] if old is not None and table.name != 'auth_sessions' else []
            if records:
                destination.execute(table.insert(), records)
                destination.execute(text("SELECT setval(pg_get_serial_sequence(:table, 'id'), :value, true)"), {"table": table.name, "value": max(row['id'] for row in records)})
            count = destination.execute(select(func.count()).select_from(table)).scalar()
            assert count == len(records), table.name
            counts[table.name] = count
    source.dispose()
    target.dispose()
    print("PostgreSQL copy completed; source SQLite preserved. Row counts:", counts)


if __name__ == "__main__":
    migrate()
