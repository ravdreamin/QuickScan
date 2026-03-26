"""
Session management endpoints (teacher-facing):
  - POST /sessions              (create a new session)
  - GET  /sessions              (list sessions I own / am enrolled in)
  - POST /sessions/{id}/enroll  (enroll a student by email)
  - GET  /sessions/{id}/attendance  (attendance register for a session)
  - GET  /sessions/{id}/attendance/export  (download Excel)
  - GET  /sessions/{id}/analytics   (session stats)
"""

import secrets as _secrets
import io
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.session import Session
from app.models.enrollment import Enrollment
from app.models.attendance import Attendance
from app.api.deps import get_current_user, require_teacher


class CreateSessionRequest(BaseModel):
    name: str
    start_time: datetime
    end_time: datetime
    latitude: float | None = None
    longitude: float | None = None
    radius_meters: int = 100


class EnrollRequest(BaseModel):
    student_email: str


router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("")
async def create_session(
    payload: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    session = Session(
        name=payload.name,
        start_time=payload.start_time,
        end_time=payload.end_time,
        secret_key=_secrets.token_hex(32),
        instructor_id=current_user.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        radius_meters=payload.radius_meters,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "id": str(session.id),
        "name": session.name,
        "start_time": session.start_time.isoformat(),
        "end_time": session.end_time.isoformat(),
        "latitude": session.latitude,
        "longitude": session.longitude,
        "radius_meters": session.radius_meters,
    }


@router.get("")
async def list_my_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.TEACHER:
        query = select(Session).where(Session.instructor_id == current_user.id).order_by(Session.start_time.desc())
    else:
        query = (
            select(Session)
            .join(Enrollment, Enrollment.session_id == Session.id)
            .where(Enrollment.student_id == current_user.id)
            .order_by(Session.start_time.desc())
        )

    result = await db.execute(query)
    sessions = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "name": s.name,
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "latitude": s.latitude,
            "longitude": s.longitude,
            "radius_meters": s.radius_meters,
        }
        for s in sessions
    ]


@router.post("/{session_id}/enroll")
async def enroll_student(
    session_id: UUID,
    payload: EnrollRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    result = await db.execute(select(User).where(User.email == payload.student_email))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail=f"No user found with email {payload.student_email}")

    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == student.id,
            Enrollment.session_id == session_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Student already enrolled")

    enrollment = Enrollment(student_id=student.id, session_id=session_id)
    db.add(enrollment)
    await db.commit()

    return {"message": f"{student.full_name} enrolled successfully", "student_email": student.email}


# ---------------------------------------------------------------------------
# GET /sessions/{id}/attendance — Attendance register (like a class register)
# ---------------------------------------------------------------------------
@router.get("/{session_id}/attendance")
async def get_session_attendance(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    # Verify session ownership
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    # Get all enrolled students
    enrolled_q = (
        select(User.id, User.full_name, User.email, User.device_id)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.session_id == session_id)
    )
    enrolled_result = await db.execute(enrolled_q)
    enrolled_students = enrolled_result.all()

    # Get attendance records for this session
    att_q = select(Attendance).where(Attendance.session_id == session_id)
    att_result = await db.execute(att_q)
    attendance_records = att_result.scalars().all()

    # Build lookup: student_id -> attendance record
    att_map = {}
    for a in attendance_records:
        if a.student_id not in att_map or a.status == "Present":
            att_map[a.student_id] = a

    # Build register rows
    register = []
    for student_id, full_name, email, device_id in enrolled_students:
        att = att_map.get(student_id)
        register.append({
            "student_id": str(student_id),
            "full_name": full_name,
            "email": email,
            "device_id": device_id or "NOT BOUND",
            "status": att.status if att else "Absent",
            "scan_time": att.timestamp.isoformat() if att else None,
            "scan_lat": att.scan_latitude if att else None,
            "scan_lon": att.scan_longitude if att else None,
        })

    return {
        "session_id": str(session_id),
        "session_name": session.name,
        "total_enrolled": len(enrolled_students),
        "total_present": sum(1 for r in register if r["status"] == "Present"),
        "total_absent": sum(1 for r in register if r["status"] == "Absent"),
        "register": register,
    }


# ---------------------------------------------------------------------------
# GET /sessions/{id}/attendance/export — Download as Excel
# ---------------------------------------------------------------------------
@router.get("/{session_id}/attendance/export")
async def export_attendance_excel(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    # Reuse the attendance logic
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    # Get enrolled students
    enrolled_q = (
        select(User.id, User.full_name, User.email, User.device_id)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.session_id == session_id)
    )
    enrolled_result = await db.execute(enrolled_q)
    enrolled_students = enrolled_result.all()

    # Get attendance
    att_q = select(Attendance).where(Attendance.session_id == session_id)
    att_result = await db.execute(att_q)
    attendance_records = att_result.scalars().all()

    att_map = {}
    for a in attendance_records:
        if a.student_id not in att_map or a.status == "Present":
            att_map[a.student_id] = a

    # Build Excel
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance Register"

    # Title
    ws.merge_cells("A1:G1")
    ws["A1"] = f"Attendance Register — {session.name}"
    ws["A1"].font = Font(bold=True, size=14)
    ws["A1"].alignment = Alignment(horizontal="center")

    ws.merge_cells("A2:G2")
    ws["A2"] = f"Session ID: {session.id} | Date: {session.start_time.strftime('%Y-%m-%d %H:%M')}"
    ws["A2"].font = Font(size=10, color="666666")
    ws["A2"].alignment = Alignment(horizontal="center")

    # Headers
    headers = ["#", "Full Name", "Email", "Device ID", "Status", "Scan Time", "Location"]
    header_fill = PatternFill(start_color="37352F", end_color="37352F", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=10)
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin"),
    )

    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border

    # Data rows
    present_fill = PatternFill(start_color="EDF3EC", end_color="EDF3EC", fill_type="solid")
    absent_fill = PatternFill(start_color="FBE4E4", end_color="FBE4E4", fill_type="solid")

    for idx, (student_id, full_name, email, device_id) in enumerate(enrolled_students, 1):
        att = att_map.get(student_id)
        row = idx + 4
        status = att.status if att else "Absent"
        fill = present_fill if status == "Present" else absent_fill

        values = [
            idx,
            full_name,
            email,
            device_id or "NOT BOUND",
            status,
            att.timestamp.strftime("%H:%M:%S") if att else "—",
            f"{att.scan_latitude:.4f}, {att.scan_longitude:.4f}" if att and att.scan_latitude else "—",
        ]

        for col, val in enumerate(values, 1):
            cell = ws.cell(row=row, column=col, value=val)
            cell.fill = fill
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center")

    # Summary row
    summary_row = len(enrolled_students) + 6
    ws.cell(row=summary_row, column=1, value="TOTAL").font = Font(bold=True)
    ws.cell(row=summary_row, column=4, value=f"Enrolled: {len(enrolled_students)}").font = Font(bold=True)
    present_count = sum(1 for sid, *_ in enrolled_students if sid in att_map and att_map[sid].status == "Present")
    ws.cell(row=summary_row, column=5, value=f"Present: {present_count}").font = Font(bold=True, color="0F7B6C")

    # Column widths
    ws.column_dimensions["A"].width = 5
    ws.column_dimensions["B"].width = 25
    ws.column_dimensions["C"].width = 30
    ws.column_dimensions["D"].width = 22
    ws.column_dimensions["E"].width = 12
    ws.column_dimensions["F"].width = 15
    ws.column_dimensions["G"].width = 22

    # Save to buffer
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"attendance_{session.name.replace(' ', '_')}_{session.start_time.strftime('%Y%m%d')}.xlsx"

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# GET /sessions/{id}/analytics — Session analytics
# ---------------------------------------------------------------------------
@router.get("/{session_id}/analytics")
async def get_session_analytics(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    # Counts
    enrolled_count = await db.execute(
        select(func.count()).select_from(Enrollment).where(Enrollment.session_id == session_id)
    )
    total_enrolled = enrolled_count.scalar() or 0

    present_count = await db.execute(
        select(func.count()).select_from(Attendance).where(
            Attendance.session_id == session_id,
            Attendance.status == "Present",
        )
    )
    total_present = present_count.scalar() or 0

    oob_count = await db.execute(
        select(func.count()).select_from(Attendance).where(
            Attendance.session_id == session_id,
            Attendance.status == "Out of Bounds",
        )
    )
    total_oob = oob_count.scalar() or 0

    return {
        "session_id": str(session_id),
        "session_name": session.name,
        "start_time": session.start_time.isoformat(),
        "end_time": session.end_time.isoformat(),
        "total_enrolled": total_enrolled,
        "total_present": total_present,
        "total_absent": total_enrolled - total_present,
        "total_out_of_bounds": total_oob,
        "attendance_rate": round((total_present / total_enrolled * 100), 1) if total_enrolled > 0 else 0,
        "geofence": {
            "lat": session.latitude,
            "lon": session.longitude,
            "radius_m": session.radius_meters,
        } if session.latitude else None,
    }
