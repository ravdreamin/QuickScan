from uuid import UUID
from pydantic import BaseModel


class ScanRequest(BaseModel):
    session_id: UUID
    qr_timestamp: int
    hmac_signature: str
    student_lat: float
    student_lon: float
    hardware_id: str


class ScanResponse(BaseModel):
    message: str
    status: str
    attendance_id: UUID
