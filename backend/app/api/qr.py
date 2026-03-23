"""
QR code generation endpoint.
Teachers request a signed QR payload; the action is recorded in the audit ledger.
"""

import hmac
import hashlib
import time
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.session import Session
from app.models.ledger import AuditLedger
from app.api.deps import require_teacher
from app.schemas.qr import QRResponse

router = APIRouter(prefix="/sessions", tags=["QR"])


@router.get("/{session_id}/qr", response_model=QRResponse)
async def generate_qr(
    session_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    # 1. Fetch the session
    query = select(Session).where(Session.id == session_id)
    result = await db.execute(query)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2. Authorization: only the session instructor may generate QRs
    if session.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the instructor of this session.",
        )

    # 3. Generate HMAC-SHA256 signature
    current_timestamp = int(time.time())
    message = f"{session.id}{current_timestamp}"
    signature = hmac.new(
        key=session.secret_key.encode("utf-8"),
        msg=message.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    # 4. Audit log
    ledger_entry = AuditLedger(
        actor_id=current_user.id,
        action="QR_GENERATED",
        target_id=session.id,
        timestamp=datetime.now(timezone.utc),
        ip_address=request.client.host if request.client else "unknown",
    )
    db.add(ledger_entry)
    await db.commit()

    return QRResponse(
        session_id=str(session.id),
        timestamp=current_timestamp,
        hmac_signature=signature,
        class_lat=session.latitude,
        class_lon=session.longitude,
    )
