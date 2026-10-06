from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator
from typing_extensions import Annotated
import re

CoaCode = Annotated[str, StringConstraints(pattern=r"^\d{9}$")]

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
    role: Literal["ADMIN", "USER"]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=120, pattern=r"^[A-Za-z0-9._-]+$")
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    role: Literal["ADMIN", "USER"]
    password: str = Field(min_length=12, max_length=200)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)


class UserUpdate(BaseModel):
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


class CoaUpdate(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)] | None = None
    category: str | None = Field(default=None, max_length=120)


class CoaStatus(BaseModel):
    is_active: bool


class ConfirmUpload(BaseModel):
    preview_id: str = Field(min_length=20, max_length=100)
    decision: Literal["CONFIRM", "REPLACE", "CANCEL"]
