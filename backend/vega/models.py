from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('ADMIN', 'USER')", name="ck_users_role"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(8), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    coas: Mapped[list[Coa]] = relationship(back_populates="department")


class Coa(Base):
    __tablename__ = "coa"
    __table_args__ = (CheckConstraint("length(code) = 9", name="ck_coa_code_nine_digits"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(9), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(120))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_gl_derived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    department: Mapped[Department] = relationship(back_populates="coas")


class UploadBatch(Base):
    __tablename__ = "upload_batches"
    __table_args__ = (
        CheckConstraint("kind IN ('BUDGET', 'GL')", name="ck_upload_batch_kind"),
        CheckConstraint("status IN ('ACTIVE', 'REPLACED', 'CANCELLED')", name="ck_upload_batch_status"),
        CheckConstraint("(kind = 'BUDGET' AND period IS NULL) OR (kind = 'GL' AND period BETWEEN 1 AND 12)", name="ck_upload_batch_period"),
        CheckConstraint("replaced_batch_id IS NULL OR replaced_batch_id <> id", name="ck_upload_batch_not_self_replaced"),
        Index("uq_active_gl_period", "fy", "period", unique=True, postgresql_where=text("kind = 'GL' AND status = 'ACTIVE'"), sqlite_where=text("kind = 'GL' AND status = 'ACTIVE'")),
        Index("uq_active_budget_fy", "fy", unique=True, postgresql_where=text("kind = 'BUDGET' AND status = 'ACTIVE'"), sqlite_where=text("kind = 'BUDGET' AND status = 'ACTIVE'")),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(8), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    fy: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[int | None] = mapped_column(Integer)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    rows_read: Mapped[int] = mapped_column(Integer, nullable=False)
    rows_imported: Mapped[int] = mapped_column(Integer, nullable=False)
    rows_rejected: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(12), nullable=False, default="ACTIVE")
    replaced_batch_id: Mapped[int | None] = mapped_column(ForeignKey("upload_batches.id", ondelete="SET NULL"))
    uploader: Mapped[User] = relationship(foreign_keys=[uploaded_by])


class BudgetEntry(Base):
    __tablename__ = "budget_entries"
    __table_args__ = (
        CheckConstraint("period BETWEEN 1 AND 12", name="ck_budget_period"),
        UniqueConstraint("fy", "period", "coa_id", name="uq_budget_fy_period_coa"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fy: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[int] = mapped_column(Integer, nullable=False)
    coa_id: Mapped[int] = mapped_column(ForeignKey("coa.id", ondelete="RESTRICT"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("upload_batches.id", ondelete="CASCADE"), nullable=False)


class ActualEntry(Base):
    __tablename__ = "actual_entries"
    __table_args__ = (CheckConstraint("period BETWEEN 1 AND 12", name="ck_actual_period"), Index("ix_actual_fy_period_coa", "fy", "period", "coa_id"))

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fy: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[int] = mapped_column(Integer, nullable=False)
    coa_id: Mapped[int] = mapped_column(ForeignKey("coa.id", ondelete="RESTRICT"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    account_number: Mapped[str] = mapped_column(String(80), nullable=False)
    section: Mapped[str | None] = mapped_column(String(20))
    txn_date: Mapped[date | None] = mapped_column(Date)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="")
    exch_rate: Mapped[Decimal | None] = mapped_column(Numeric(18, 6))
    debit_native: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    credit_native: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    reference: Mapped[str | None] = mapped_column(String(200))
    vendor: Mapped[str | None] = mapped_column(String(200))
    row_no: Mapped[int] = mapped_column(Integer, nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("upload_batches.id", ondelete="CASCADE"), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    entity: Mapped[str | None] = mapped_column(String(60))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    detail: Mapped[str | None] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
