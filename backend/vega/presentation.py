"""Serve the presentation UI using the configured PostgreSQL database."""
from pathlib import Path
import os

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]


def configure_postgresql():
    config = ROOT / ".env.postgresql"
    if config.exists():
        load_dotenv(config, override=True)
    from backend.vega.config import database_url
    url = database_url()
    if make_url(url).get_backend_name() != "postgresql":
        raise RuntimeError("Configure PostgreSQL in .env.postgresql before starting this server.")
    if os.getenv("DB_PASSWORD", "").startswith("replace-"):
        raise RuntimeError("Enter your PostgreSQL password in .env.postgresql first.")
    pg_bin = Path("C:/Program Files/PostgreSQL/18/bin")
    if pg_bin.exists():
        os.environ["PATH"] = str(pg_bin) + os.pathsep + os.environ.get("PATH", "")
    return url


def create_presentation_app():
    configure_postgresql()
    from backend.vega.db import engine
    from backend.vega.main import create_app
    from sqlalchemy import text
    from fastapi.staticfiles import StaticFiles

    with engine.connect() as connection:
        connection.execute(text("SELECT 1 FROM users LIMIT 1"))
    app = create_app()
    app.mount("/", StaticFiles(directory=ROOT / "dist", html=True), name="presentation")
    return app


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(create_presentation_app(), host="127.0.0.1", port=3000)
