from backend.vega.db import SessionLocal
from backend.vega.models import User
from backend.vega.security import hash_password
from sqlalchemy import select

with SessionLocal.begin() as session:
    admin = session.scalar(select(User).where(User.username == "admin"))
    if admin is None:
        session.add(User(username="admin", full_name="Administrator", role="ADMIN", is_active=True, password_hash=hash_password("adminpassword123")))
    else:
        admin.password_hash = hash_password("adminpassword123")
        admin.role = "ADMIN"
        
    viewer = session.scalar(select(User).where(User.username == "viewer"))
    if viewer is None:
        session.add(User(username="viewer", full_name="Viewer", role="USER", is_active=True, password_hash=hash_password("viewerpassword123")))
    else:
        viewer.password_hash = hash_password("viewerpassword123")
        viewer.role = "USER"

print("Seeded 'admin' and 'viewer' users successfully.")
