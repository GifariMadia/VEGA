import sqlite3

from backend.vega.backup import create_database_backup


def test_sqlite_backup_is_a_restorable_snapshot(tmp_path):
    source = tmp_path / "source.db"
    with sqlite3.connect(source) as db:
        db.execute("CREATE TABLE sample (amount NUMERIC)")
        db.execute("INSERT INTO sample VALUES (-125.75)")
    snapshot = create_database_backup(f"sqlite:///{source.as_posix()}", str(tmp_path / "backups"), "replacement")
    with sqlite3.connect(source) as db:
        db.execute("DELETE FROM sample")
    with sqlite3.connect(snapshot) as db:
        assert db.execute("SELECT amount FROM sample").fetchone()[0] == -125.75
