from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator
from typing_extensions import Annotated
import re

CoaCode = Annotated[str, StringConstraints(pattern=r"^\d{9}$")]
Email = Annotated[str, StringConstraints(strip_whitespace=True, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")]

def validate_password_strength(v: str) -> str:
    if v is None:
        return v
    if len(v.encode("utf-8")) > 72:
        raise ValueError("Password maksimal 72 byte UTF-8.")
    if not re.search(r"[a-z]", v) or not re.search(r"[A-Z]", v) or not re.search(r"\d", v) or not re.search(r"[\W_]", v):
        raise ValueError("Password harus mengandung huruf besar, huruf kecil, angka, dan simbol.")
    return v


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=200)


class UserPublic(BaseModel):
    id: int
    username: str
    full_name: str
    email: str | None = None
    role: Literal["ADMIN", "USER"]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=120, pattern=r"^[A-Za-z0-9._-]+$")
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    role: Literal["ADMIN", "USER"]
    password: str = Field(min_length=12, max_length=200)
    email: Email | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)


class UserUpdate(BaseModel):
    email: Email | None = None
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)] | None = None
    role: Literal["ADMIN", "USER"] | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=12, max_length=200)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        return validate_password_strength(v) if v else v


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=1)
    new_password: str = Field(min_length=12, max_length=200)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)


class CoaCreate(BaseModel):
    code: CoaCode
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    category: str | None = Field(default=None, max_length=120)
    is_active: bool = True
    description: str | None = Field(default=None, max_length=4000)
    register_system: str = Field(default="SAP ERP", min_length=1, max_length=120)
    in_scope: bool = True
    initial_budget: Decimal | None = Field(default=None, ge=0, max_digits=18, decimal_places=2)
    fiscal_year: int | None = Field(default=None, ge=2000, le=2200)


class CoaUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=4000)
    register_system: str | None = Field(default=None, min_length=1, max_length=120)
    in_scope: bool | None = None
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)] | None = None
    category: str | None = Field(default=None, max_length=120)


class CoaStatus(BaseModel):
    is_active: bool


class ConfirmUpload(BaseModel):
    preview_id: str = Field(min_length=20, max_length=100)
    decision: Literal["CONFIRM", "REPLACE", "CANCEL"]
    replace_reason: str | None = Field(default=None, max_length=2000)
