# from xmlrpc.client import Boolean
from sqlalchemy import Boolean, Integer, String, JSON, Table, Column, ForeignKey, DateTime
from sqlalchemy.orm import relationship
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