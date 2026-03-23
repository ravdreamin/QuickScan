from fastapi import FastAPI

# Import all models eagerly so SQLAlchemy metadata is fully populated
import app.models  # noqa: F401

from app.api import auth, qr, attendance

app = FastAPI(
    title="QuickScan 2.0 API",
    description="Secure QR-Based Attendance Platform",
    version="2.0.0"
)

# Connect routers
app.include_router(auth.router)
app.include_router(qr.router)
app.include_router(attendance.router)


@app.get("/")
async def root():
    return {"message": "QuickScan 2.0 API is running."}