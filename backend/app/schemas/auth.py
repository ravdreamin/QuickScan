from uuid import UUID
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    hardware_id: str

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str # "TEACHER" or "STUDENT"
    hardware_id: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "paseto"
