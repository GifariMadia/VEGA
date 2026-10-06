"""Isolated, persistent local presentation server; never uses the configured DB."""
from __future__ import annotations

import os
import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEMO = ROOT / "tmp" / "presentation"


def create_demo_app():
    DEMO.mkdir(parents=True, exist_ok=True)
    secret_file = DEMO / "session-secret.txt"
    if not secret_file.exists():
        secret_file.write_text(secrets.token_urlsafe(48), encoding="utf-8")
    os.environ["DATABASE_URL"] = "sqlite:///" + (DEMO / "vega.db").as_posix()
    os.environ["JWT_SECRET_KEY"] = secret_file.read_text(encoding="utf-8")
    os.environ["BACKUP_DIR"] = str(DEMO / "backups")

    from sqlalchemy import select
    from fastapi.staticfiles import StaticFiles
    from backend.vega.db import engine, SessionLocal
    from backend.vega.models import Base, Department, User
    from backend.vega.security import hash_password
    from backend.vega.main import create_app

    Base.metadata.create_all(engine)
    with SessionLocal.begin() as session:
        if not session.scalar(select(Department.id).where(Department.code == "MIS000")):
            session.add(Department(code="MIS000", name="MIS Department"))
        for username, role in (("admin", "ADMIN"), ("viewer", "USER")):
            if not session.scalar(select(User.id).where(User.username == username)):
                password = secrets.token_urlsafe(15)
                session.add(User(username=username, full_name=f"Presentation {username.title()}", role=role,
                                 is_active=True, password_hash=hash_password(password)))
                with (DEMO / "accounts.txt").open("a", encoding="utf-8") as accounts:
                    accounts.write(f"{username}: {password}\n")
    app = create_app()
    app.mount("/", StaticFiles(directory=ROOT / "dist", html=True), name="presentation")
    return app


if __name__ == "__main__":
    import uvicorn

    if not (ROOT / "dist" / "index.html").exists():
        raise SystemExit("Run npm run build first.")
    print("Presentation: http://127.0.0.1:3000 | Accounts: tmp/presentation/accounts.txt")
    uvicorn.run(create_demo_app(), host="127.0.0.1", port=3000)
