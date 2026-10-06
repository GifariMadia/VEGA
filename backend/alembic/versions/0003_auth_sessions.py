"""Persist login sessions so logout and password reset revoke access."""
from alembic import op
from backend.vega.models import AuthSession

revision = "0003_auth_sessions"
down_revision = "2f1e8b2a1b46"
branch_labels = None
depends_on = None


def upgrade():
    AuthSession.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    AuthSession.__table__.drop(op.get_bind(), checkfirst=True)
