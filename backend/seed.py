import asyncio
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization, Department
from app.models.user import User, UserRole
from app.core.security import get_password_hash


async def seed_db():
    async with AsyncSessionLocal() as db:
        # 1. Create the College Foundation
        org = Organization(name="Government College Chandigarh")
        db.add(org)
        await db.commit()
        await db.refresh(org)

        dept = Department(name="BCA", organization_id=org.id)
        db.add(dept)
        await db.commit()
        await db.refresh(dept)

        # 2. Inject the Test Student
        # Note: device_id is deliberately left NULL
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
        print("✅ DATABASE SEEDED SUCCESSFULLY")
        print("Test Email: gin@gcc.edu")
        print("Test Pass:  testpass123")
        print("---")


if __name__ == "__main__":
    asyncio.run(seed_db())