# from xmlrpc.client import Boolean
from sqlalchemy import Boolean, Integer, String, JSON, Table, Column, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime


Base = declarative_base()

# Junction table for many-to-many relationship
article_category = Table(
    'article_category',
    Base.metadata,
    Column('article_id', Integer, ForeignKey('articles.id'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(100), unique=True, nullable=False)
    fname = Column(String(50), nullable=False)
    mname = Column(String(50), nullable=True)
    lname = Column(String(50), nullable=False)
    uname = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    h_password = Column(Text, nullable=False)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True),server_default=func.now())

    invites = relationship("AuthorizedEmail", back_populates="inviter", cascade="all, delete")

class AuthorizedEmail(Base):
    __tablename__  = "authorized_emails"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True),server_default=func.now())

    inviter_id = Column(Integer, ForeignKey("users.id"))
    inviter = relationship("User", back_populates="invites")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)

    # Many-to-many relationship with Article
    articles = relationship("Article", secondary=article_category, back_populates="categories")

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(250), nullable=False)
    slug = Column(String(250), unique=True, nullable=False)
    description = Column(String, nullable=False)
    media = Column(JSON, nullable=False)  # JSON string for media
    content = Column(JSON, nullable=False)  # JSON string for content
    published_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tag = Column(String(50), nullable=False)
    is_published = Column(Boolean, default=False)

    # Many-to-many relationship with Category
    categories = relationship("Category", secondary=article_category, back_populates="articles")