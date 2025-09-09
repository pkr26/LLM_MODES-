"""
Database configuration and session management.

This module handles SQLAlchemy engine creation, session management,
and provides database dependency injection for FastAPI.
"""

import logging
from typing import Generator
from sqlalchemy import create_engine, Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from config import settings

logger = logging.getLogger(__name__)

# Database engine configuration
def create_database_engine() -> Engine:
    """Create and configure the database engine."""
    connect_args = {}
    
    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        logger.info("Using SQLite database")
    else:
        logger.info("Using PostgreSQL database")
    
    engine = create_engine(
        settings.database_url,
        connect_args=connect_args,
        echo=settings.debug,  # Log SQL queries in debug mode
        pool_pre_ping=True,   # Verify connections before use
        pool_recycle=300,     # Recreate connections after 5 minutes
    )
    
    logger.info(f"Database engine created successfully")
    return engine

# Create engine and session factory
engine = create_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base for models
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """
    Database dependency for FastAPI dependency injection.
    
    Yields:
        Session: SQLAlchemy database session
        
    Raises:
        Exception: If database connection fails
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()