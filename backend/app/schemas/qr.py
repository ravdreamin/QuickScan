from uuid import UUID
from pydantic import BaseModel


class QRResponse(BaseModel):
    session_id: str
    timestamp: int
    hmac_signature: str
    class_lat: float | None = None
    class_lon: float | None = None
