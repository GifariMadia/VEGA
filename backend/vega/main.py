from __future__ import annotations

import logging
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from backend.vega.dependencies import DbSession
from backend.vega.routers import auth, coa, dashboard, uploads, users

logger = logging.getLogger("vega.api")


def create_app() -> FastAPI:
    app = FastAPI(title="VEGA API", version="1.0.0", openapi_url="/api/v1/openapi.json")
    origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",") if origin.strip()]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://localhost:3000 http://localhost:5173"
        return response

    @app.exception_handler(HTTPException)
    async def http_error(_request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code, headers=exc.headers, content={"success": False, "message": str(exc.detail), "errors": [{"issue": str(exc.detail)}]})

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request, exc: RequestValidationError):
        errors = [{"field": ".".join(str(part) for part in item["loc"]), "issue": item["msg"]} for item in exc.errors()]
        return JSONResponse(status_code=422, content={"success": False, "message": "Request validation failed.", "errors": errors})

    @app.exception_handler(SQLAlchemyError)
    async def database_error(_request, exc: SQLAlchemyError):
        logger.exception("Database operation failed", exc_info=exc)
        return JSONResponse(status_code=503, content={"success": False, "message": "Database is unavailable or the operation could not be completed.", "errors": []})

    @app.get("/api/v1/health")
    def health():
        return {"success": True, "message": "VEGA API is running.", "data": {"status": "ok"}}

    @app.get("/api/v1/health/ready")
    def readiness(db: DbSession):
        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=503, detail="Database is not ready.") from exc
        return {"success": True, "message": "Database is ready.", "data": {"status": "ready"}}

    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware

    limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.include_router(auth.router)
    app.include_router(coa.router)
    app.include_router(dashboard.router)
    app.include_router(uploads.router)
    app.include_router(users.router)
    return app


app = create_app()