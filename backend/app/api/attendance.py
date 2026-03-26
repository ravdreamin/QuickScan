"""
Attendance scan & validation engine.

Validation pipeline:
  1. Time check   – reject expired QR codes (>15 s)
  2. Crypto check – HMAC-SHA256 re-hash against DB secret key
  3. Device check – hardware_id must match locked device
  4. Geo check    – Haversine distance from class coordinates
  5. Duplicate    – prevent double-scanning
"""

import hmac
import hashlib
import time
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.session import Session
from app.models.ledger import AuditLedger
from app.models.enrollment import Enrollment
from app.models.attendance import Attendance
from app.api.deps import require_student
from app.schemas.attendance import ScanRequest, ScanResponse
from app.core.geo import is_within_radius

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/scan", response_model=ScanResponse)
async def scan_qr(
    payload: ScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_student),
):
    current_time = int(time.time())

    # ── Validation 1: Time ──────────────────────────────────────────────
    if current_time - payload.qr_timestamp > 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR Code Expired",
        )
    if current_time < payload.qr_timestamp - 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid QR timestamp (in the future)",
        )

    # ── Fetch Session ───────────────────────────────────────────────────
    query = select(Session).where(Session.id == payload.session_id)
    result = await db.execute(query)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── Validation 1.5: 5-minute Session Attendance Limit ──────────────────────
    window_query = (
        select(AuditLedger.timestamp)
        .where(
            AuditLedger.target_id == session.id,
            AuditLedger.action == "PROJECTION_STARTED"
        )
        .order_by(AuditLedger.timestamp.desc())
        .limit(1)
    )
    result = await db.execute(window_query)
    projection_start = result.scalar_one_or_none()

    if not projection_start:
        fallback_query = (
            select(AuditLedger.timestamp)
            .where(AuditLedger.target_id == session.id, AuditLedger.action == "QR_GENERATED")
            .order_by(AuditLedger.timestamp.asc())
            .limit(1)
        )
        res = await db.execute(fallback_query)
        projection_start = res.scalar_one_or_none()

    if projection_start:
        elapsed = datetime.now(timezone.utc) - projection_start
        if elapsed.total_seconds() > 300:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Attendance window successfully closed. You can no longer scan for this session.",
            )

    # ── Validation 2: Cryptography ──────────────────────────────────────
    message = f"{session.id}{payload.qr_timestamp}"
    expected = hmac.new(
        key=session.secret_key.encode("utf-8"),
        msg=message.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, payload.hmac_signature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid QR Code",
        )

    # ── Validation 3: Device Lock (anti-proxy) ──────────────────────────
    if current_user.device_id != payload.hardware_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Proxy Detected. Device ID mismatch.",
        )

    # ── Validation 4: Geolocation ───────────────────────────────────────
    if session.latitude is not None and session.longitude is not None:
        if not is_within_radius(
            target_lat=session.latitude,
            target_lon=session.longitude,
            scan_lat=payload.student_lat,
            scan_lon=payload.student_lon,
            radius_meters=session.radius_meters,
        ):
            # Still record the attempt for audit purposes
            oob_record = Attendance(
                student_id=current_user.id,
                session_id=payload.session_id,
                timestamp=datetime.now(timezone.utc),
                scan_latitude=payload.student_lat,
                scan_longitude=payload.student_lon,
                status="Out of Bounds",
            )
            db.add(oob_record)
            await db.commit()
            await db.refresh(oob_record)

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Out of Bounds. You are not within the class geofence.",
            )

    # ── Validation 5: Enrollment ────────────────────────────────────────
    enrollment_q = select(Enrollment).where(
        Enrollment.student_id == current_user.id,
        Enrollment.session_id == payload.session_id,
    )
    enrollment_result = await db.execute(enrollment_q)
    enrollment = enrollment_result.scalar_one_or_none()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not enrolled in this session",
        )

    # ── Validation 6: Duplicate check ───────────────────────────────────
    dup_q = select(Attendance).where(
        Attendance.student_id == current_user.id,
        Attendance.session_id == payload.session_id,
        Attendance.status == "Present",
    )
    dup_result = await db.execute(dup_q)
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already recorded for this session",
        )

    # ── Success: Insert attendance ──────────────────────────────────────
    new_attendance = Attendance(
        student_id=current_user.id,
        session_id=payload.session_id,
        timestamp=datetime.now(timezone.utc),
        scan_latitude=payload.student_lat,
        scan_longitude=payload.student_lon,
        status="Present",
    )
    db.add(new_attendance)
    await db.commit()
    await db.refresh(new_attendance)

    return ScanResponse(
        message="Attendance successfully recorded",
        status="Present",
        attendance_id=new_attendance.id,
    )
