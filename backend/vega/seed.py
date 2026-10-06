from __future__ import annotations

import os

from sqlalchemy import select

from backend.vega.db import SessionLocal
from backend.vega.models import Department, User
from backend.vega.security import hash_password


def seed() -> None:
    username = os.getenv("SEED_ADMIN_USERNAME", "").strip()
    full_name = os.getenv("SEED_ADMIN_FULL_NAME", "VEGA Administrator").strip()
    password = os.getenv("SEED_ADMIN_PASSWORD", "")
    if not username or len(password) < 12 or password.lower().startswith(("provide-", "replace-", "your-")):
        raise RuntimeError("Set SEED_ADMIN_USERNAME and a SEED_ADMIN_PASSWORD of at least 12 characters before seeding.")

    with SessionLocal.begin() as session:
        department = session.scalar(select(Department).where(Department.code == "MIS000"))
        if department is None:
            session.add(Department(code="MIS000", name="MIS Department"))
        admin = session.scalar(select(User).where(User.username == username))
        if admin is None:
            session.add(User(username=username, full_name=full_name, role="ADMIN", is_active=True, password_hash=hash_password(password)))


if __name__ == "__main__":
    seed()
    print("Seed completed: MIS000 department and configured administrator are available.")