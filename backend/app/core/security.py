from datetime import datetime, timedelta, timezone
import bcrypt
from pyseto import Key, encode
from app.core.config import settings

# Load the 32-byte secret key for Paseto v4.local
paseto_key = Key.new(version=4, purpose="local", key=settings.PASETO_SECRET_KEY.encode("utf-8"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash for the given password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_paseto_token(user_id: str, role: str, device_id: str) -> str:
    """Generates an encrypted Paseto token valid for 24 hours."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=24)

    # The payload is ENCRYPTED, not just encoded like JWT
    payload = {
        "sub": str(user_id),
        "role": role,
        "device_id": device_id,
        "exp": exp.isoformat()
    }

    token = encode(paseto_key, payload)
    return token.decode("utf-8")