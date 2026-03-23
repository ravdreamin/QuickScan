import asyncio
from datetime import datetime, timezone, timedelta

async def seed():
    from app.models.base import Base
    from app.models.organization import Organization, Department
    from app.models.user import User, UserRole
    from app.models.session import Session
    from app.models.enrollment import Enrollment
    from app.models.attendance import Attendance
    from app.models.ledger import AuditLedger
    from app.db.session import AsyncSessionLocal
    from app.core.security import get_password_hash

    async with AsyncSessionLocal() as db:
        # Check if users already exist
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.email == "admin@quickscan.com"))
        teacher = result.scalar_one_or_none()
        
        result = await db.execute(select(User).where(User.email == "student@quickscan.com"))
        student = result.scalar_one_or_none()

        if not teacher:
            teacher = User(
                email="admin@quickscan.com",
                full_name="QuickScan Admin",
                hashed_password=get_password_hash("password123"),
                role=UserRole.TEACHER,
            )
            db.add(teacher)
            print("Created teacher: admin@quickscan.com / password123")
        else:
            print("Teacher admin@quickscan.com already exists.")

        if not student:
            student = User(
                email="student@quickscan.com",
                full_name="QuickScan Student",
                hashed_password=get_password_hash("password123"),
                role=UserRole.STUDENT,
            )
            db.add(student)
            print("Created student: student@quickscan.com / password123")
        else:
            print("Student student@quickscan.com already exists.")

        await db.commit()
        await db.refresh(teacher)
        
        # Give the teacher a default session for projection
        result = await db.execute(select(Session).where(Session.instructor_id == teacher.id))
        session = result.scalar_one_or_none()
        if not session:
            session = Session(
                name="Demo Class 101",
                start_time=datetime.now(timezone.utc) - timedelta(hours=1),
                end_time=datetime.now(timezone.utc) + timedelta(hours=24),
                secret_key="demosecretkey123",
                instructor_id=teacher.id,
                latitude=28.6139,
                longitude=77.2090,
                radius_meters=100000, # Large radius for demo 
            )
            db.add(session)
            await db.commit()
            print(f"Created Session UUID: {session.id}")
        else:
            print(f"Session already exists UUID: {session.id}")

if __name__ == "__main__":
    asyncio.run(seed())
