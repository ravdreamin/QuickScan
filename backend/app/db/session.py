from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    future=True,
    echo=True,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
)

async_session = sessionmaker(
    engine,
    expire_on_commit=False,
)

async def get_db():
    async with AsyncSession() as session:
        try:
            yield session
        finally:
            await session.close()