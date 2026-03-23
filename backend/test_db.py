import asyncio
from sqlalchemy import text
from app.db.session import engine

async def test_connection():
    try:
        async with engine.connect() as conn:
            # Send a simple 'Select 1' to the Postgres container
            result = await conn.execute(text("SELECT 1"))
            print("---")
            print("✅ CONNECTION SUCCESSFUL!")
            print(f"Result from DB: {result.fetchone()}")
            print("---")
    except Exception as e:
        print("---")
        print("❌ CONNECTION FAILED")
        print(f"Error: {e}")
        print("---")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())