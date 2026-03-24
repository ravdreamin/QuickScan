"""
Authentication routes:
  - POST /auth/register       (create account)
  - POST /auth/login          (email + password + hardware lock)
  - POST /auth/google-login   (Google OAuth2 ID-token + hardware lock)
  - GET  /auth/me             (return current user profile from token)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.security import verify_password, create_paseto_token, get_password_hash
from app.core.config import settings
from app.schemas.auth import LoginRequest, GoogleLoginRequest, TokenResponse, RegisterRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# Helper: hardware-lock + token generation (shared by both login flows)
# ---------------------------------------------------------------------------
async def _hardware_lock_and_token(
    user: User, hardware_id: str, db: AsyncSession
) -> dict:
    if user.device_id is None:
        user.device_id = hardware_id
        try:
            await db.commit()
            await db.refresh(user)
        except Exception:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not lock device. Try logging in again.",
            )
    elif user.device_id != hardware_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device mismatch. You cannot log in from a new device. Contact Admin.",
        )

    token = create_paseto_token(
        user_id=str(user.id),
        role=user.role.value,
        device_id=user.device_id,
    )
    return {"access_token": token, "token_type": "paseto"}


# ---------------------------------------------------------------------------
# GET /auth/me   (decode token → return user profile)
# ---------------------------------------------------------------------------
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "device_id": current_user.device_id,
        "is_active": current_user.is_active,
    }


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------
@router.post("/register", response_model=TokenResponse)
async def register_user(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == payload.email)
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered.")

    try:
        assigned_role = UserRole(payload.role.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role. Must be TEACHER or STUDENT.")

    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=assigned_role,
        device_id=payload.hardware_id,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return await _hardware_lock_and_token(new_user, payload.hardware_id, db)


# ---------------------------------------------------------------------------
# POST /auth/login   (email + password)
# ---------------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == credentials.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return await _hardware_lock_and_token(user, credentials.hardware_id, db)


# ---------------------------------------------------------------------------
# POST /auth/google-login   (Google OAuth2 ID-token)
# ---------------------------------------------------------------------------
@router.post("/google-login", response_model=TokenResponse)
async def google_login(
    payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)
):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on this server.",
        )

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        id_info = google_id_token.verify_oauth2_token(
            payload.google_id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token.",
        )

    email: str = id_info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token did not contain an email.",
        )

    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is None:
        import secrets

        user = User(
            email=email,
            full_name=id_info.get("name", email.split("@")[0]),
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            role=UserRole.STUDENT,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return await _hardware_lock_and_token(user, payload.hardware_id, db)