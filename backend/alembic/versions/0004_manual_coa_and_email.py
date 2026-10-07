"""Persist user email, COA metadata and separately traced manual Budget."""
from alembic import op
import sqlalchemy as sa

revision = "0004_manual_coa_and_email"
down_revision = "0003_auth_sessions"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("users", sa.Column("email", sa.String(254), nullable=True))
    op.add_column("coa", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("coa", sa.Column("register_system", sa.String(120), nullable=False, server_default="SAP ERP"))
    op.add_column("coa", sa.Column("in_scope", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("coa", sa.Column("manual_budget_amount", sa.Numeric(20, 8), nullable=True))
    op.add_column("coa", sa.Column("manual_budget_fy", sa.Integer(), nullable=True))

def downgrade():
    for name in ("manual_budget_fy", "manual_budget_amount", "in_scope", "register_system", "description"):
        op.drop_column("coa", name)
    op.drop_column("users", "email")
