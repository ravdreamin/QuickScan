"""
Audit Ledger endpoints:
  - GET /audit/ledger  (paginated audit log — teacher/admin only)
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.ledger import AuditLedger
from app.api.deps import get_current_user, require_teacher

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/ledger")
async def get_audit_ledger(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    # Total count
    count_result = await db.execute(select(func.count()).select_from(AuditLedger))
    total = count_result.scalar() or 0

    # Get entries with actor names
    query = (
        select(
            AuditLedger.id,
            AuditLedger.action,
            AuditLedger.target_id,
            AuditLedger.timestamp,
            AuditLedger.ip_address,
            AuditLedger.actor_id,
            User.full_name.label("actor_name"),
            User.email.label("actor_email"),
        )
        .join(User, User.id == AuditLedger.actor_id)
        .order_by(AuditLedger.timestamp.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(query)
    rows = result.all()

    return {
        "total": total,
        "entries": [
            {
                "id": str(r.id),
                "action": r.action,
                "target_id": str(r.target_id),
                "timestamp": r.timestamp.isoformat(),
                "ip_address": r.ip_address,
                "actor_id": str(r.actor_id),
                "actor_name": r.actor_name,
                "actor_email": r.actor_email,
            }
            for r in rows
        ],
    }
