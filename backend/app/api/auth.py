from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.db.session import get_db
from app.models.user import User
from app.core.security import verify_password, create_paseto_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


# --- Request & Response Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    hardware_id: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


# --- The Login Endpoint ---
@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    # 1. Search for the user
    query = select(User).where(User.email == credentials.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 2. Verify the hashed password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 3. THE HARDWARE LOCK LOGIC
    if user.device_id is None:
        # First login ever: Bind the phone to the student
        user.device_id = credentials.hardware_id
        await db.commit()
        await db.refresh(user)

    elif user.device_id != credentials.hardware_id:
        # Phone ID does not match the database: Block them
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device mismatch. You cannot log in from a new device. Contact Admin."
        )

    # 4. Generate the Paseto Token
    token = create_paseto_token(
        user_id=str(user.id),
        role=user.role.value,
        device_id=user.device_id
    )

    return {"access_token": token, "token_type": "paseto"}