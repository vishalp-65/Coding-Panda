"""
Database configuration and connection management
"""
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

from ..config import settings

logger = logging.getLogger(__name__)

# Database engine
engine = None
async_session_maker = None


class Base(DeclarativeBase):
    """Base class for all database models"""
    metadata = MetaData()


async def init_db():
    """Initialize database connection"""
    global engine, async_session_maker
    
    try:
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        
        async_session_maker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


from typing import AsyncGenerator, Any

async def get_db() -> AsyncGenerator[AsyncSession, Any]:
    """Get database session"""
    if not async_session_maker:
        raise RuntimeError("Database not initialized")
        
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db():
    """Close database connection"""
    global engine
    if engine:
        await engine.dispose()
        logger.info("Database connection closed")