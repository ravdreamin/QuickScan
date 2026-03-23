import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.organization import Department
from app.models.user import User, UserRole
from app.core.security import get_password_hash


async def force_user():
    async with AsyncSessionLocal() as db:
        # 1. Find the BCA department that the last script successfully made
        query = select(Department).where(Department.name == "BCA")
        result = await db.execute(query)
        dept = result.scalar_one_or_none()

        if not dept:
            print("❌ ERROR: Department not found. The database is completely empty.")
            return

        # 2. Inject the User
        student = User(
            email="gin@gcc.edu",
            hashed_password=get_password_hash("testpass123"),
            full_name="Gin",
            role=UserRole.STUDENT,
            department_id=dept.id
        )
        db.add(student)
        await db.commit()

        print("---")
        print("✅ USER FORCED INTO DATABASE SUCCESSFULLY")
        print("---")


if __name__ == "__main__":
    asyncio.run(force_user())