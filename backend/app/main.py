from fastapi import FastAPI
from app.api import auth

app = FastAPI(
    title="QuickScan 2.0 API",
    description="Secure QR-Based Attendance Platform",
    version="2.0.0"
)

# Connect the auth routes to the main app
app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "QuickScan 2.0 API is running."}