from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, unquote

from backend.vega.config import backup_dir as configured_backup_dir
from backend.vega.config import database_url as configured_database_url

logger = logging.getLogger("vega.backup")


class BackupError(RuntimeError):
    pass


def _safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", value or "manual").strip("-")
    return slug[:50] or "manual"


def create_database_backup(database_url: str | None = None, backup_dir: str | None = None, label: str = "manual") -> Path:
    target_url = database_url or configured_database_url()
    parsed = urlparse(target_url)
    if parsed.scheme == "sqlite":
        # sqlite's online backup API creates a consistent snapshot, including WAL data.
        import sqlite3
        from sqlalchemy.engine import make_url

        source = make_url(target_url).database
        if not source or source == ":memory:":
            raise BackupError("An on-disk SQLite database is required for backup.")
        backup_root = Path(backup_dir) if backup_dir else configured_backup_dir()
        backup_root.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
        path = backup_root / f"vega-backup-{timestamp}-{_safe_slug(label)}.db"
        try:
            with sqlite3.connect(f"file:{Path(source).as_posix()}?mode=ro", uri=True) as origin:
                with sqlite3.connect(path) as destination:
                    origin.backup(destination)
        except sqlite3.Error as exc:
            path.unlink(missing_ok=True)
            raise BackupError("SQLite backup failed; refusing to replace active data.") from exc
        return path
    if parsed.scheme not in {"postgresql", "postgresql+psycopg", "postgresql+psycopg2"}:
        raise BackupError("Only PostgreSQL databases can be backed up with pg_dump.")

    pg_dump = shutil.which("pg_dump")
    if pg_dump is None:
        raise BackupError("pg_dump is not installed or is not available on PATH; refusing to replace active data.")

    backup_root = Path(backup_dir) if backup_dir else configured_backup_dir()
    backup_root.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    path = backup_root / f"vega-backup-{timestamp}-{_safe_slug(label)}.sql"

    username = unquote(parsed.username) if parsed.username else os.getenv("DB_USER") or "postgres"
    password = unquote(parsed.password) if parsed.password else os.getenv("DB_PASSWORD")
    environment = os.environ.copy()
    if password:
        environment["PGPASSWORD"] = password
    else:
        environment.pop("PGPASSWORD", None)

    with tempfile.NamedTemporaryFile(prefix=".vega-backup-", suffix=".partial", dir=backup_root, delete=False) as temporary:
        temporary_path = Path(temporary.name)

    command = [
        pg_dump,
        "--host", parsed.hostname or "localhost",
        "--port", str(parsed.port or 5432),
        "--username", username,
        "--format=plain",
        "--no-password",
        "--file", str(temporary_path),
        unquote(parsed.path.lstrip("/")),
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False, env=environment)
        if result.returncode != 0:
            raise BackupError(f"pg_dump failed (exit {result.returncode}): {result.stderr.strip() or 'no details'}")
        if not temporary_path.is_file() or temporary_path.stat().st_size == 0:
            raise BackupError("pg_dump completed without creating a non-empty backup file.")
        with temporary_path.open("rb") as dump:
            signature = dump.read(256)
        if b"PostgreSQL database dump" not in signature:
            raise BackupError("pg_dump output did not contain the expected PostgreSQL dump signature.")
        temporary_path.replace(path)
        try:
            os.chmod(path, 0o600)
        except OSError:
            logger.debug("Could not restrict backup file permissions on this platform.")
        return path
    except BackupError:
        raise
    except OSError as exc:
        raise BackupError(f"Could not create the database backup: {exc}") from exc
    finally:
        temporary_path.unlink(missing_ok=True)


def main() -> None:
    backup_path = create_database_backup(label="scheduled")
    logger.info("Database backup created: %s (%s bytes)", backup_path, backup_path.stat().st_size)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    main()
