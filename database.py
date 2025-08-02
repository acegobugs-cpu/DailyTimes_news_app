from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
import aiosmtplib

load_dotenv() 

engine = create_engine(
    os.getenv("DATABASE_URL_DB"),
    pool_size=50,              # handle more concurrent users
    max_overflow=10,           # allow some temporary overflow
    pool_recycle=1800,         # recycle stale connections every 30 mins
    pool_pre_ping=False,        # check connection health before using
    connect_args={"connect_timeout": 10}  # fail fast on dead DB
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()