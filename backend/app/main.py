from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all models eagerly so SQLAlchemy metadata is fully populated
import app.models  # noqa: F401

from app.api import auth, qr, attendance, sessions, audit
from app.core.config import settings

app = FastAPI(
    title="QuickScan 2.0 API",
    description="Secure QR-Based Attendance Platform",
    version="2.0.0"
)

# CORS — support both dev (any origin) and production (specific frontend)
origins = settings.FRONTEND_URL.split(",") if settings.FRONTEND_URL != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect routers
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(qr.router)
app.include_router(attendance.router)
app.include_router(audit.router)


@app.get("/")
async def root():
    return {"message": "QuickScan 2.0 API is running."}