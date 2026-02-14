import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL_DB")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL_DB not set in .env")

# SQLAlchemy Engine
engine = create_engine(
    DATABASE_URL,
    future=True,               # Use SQLAlchemy 2.x style
    pool_size=50,              # handle more concurrent connections
    max_overflow=10,           # allow temporary overflow
    pool_recycle=1800,         # recycle connections every 30 mins
    pool_pre_ping=True,        # check connection health
    connect_args={"connect_timeout": 10}  # DB-specific, e.g., Postgres
)

# Session Local
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True
)

# Base for ORM models
Base = declarative_base()

# Dependency function for FastAPI
def get_db():
    """
    Yields a database session for use in API endpoints.
    Automatically closes the session after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
