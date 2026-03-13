# from xmlrpc.client import Boolean
from sqlalchemy import Boolean, Integer, BigInteger, String, JSON, Table, Column, ForeignKey, DateTime, Text, UniqueConstraint, Index
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

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    token_hash = Column(String(64), nullable=False, unique=True)  # sha256 hex
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    revoked = Column(Boolean, nullable=False, default=False)
    replaced_by_id = Column(BigInteger, ForeignKey("refresh_tokens.id"), nullable=True)

    ip_address = Column(String(45), nullable=True)   # supports IPv6
    user_agent = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("token_hash", name="uniq_token_hash"),
        Index("idx_refresh_tokens_user_id", "user_id"),
        Index("idx_refresh_tokens_expires_at", "expires_at"),
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
    tag = Column(String(50), nullable=False)
    media = Column(JSON, nullable=False)  # JSON string for media
    published_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Many-to-many relationship with Category
    translations = relationship("ArticleLocale", back_populates="article", cascade="all, delete-orphan")
    categories = relationship("Category", secondary=article_category, back_populates="articles")

class ArticleLocale(Base):
    __tablename__ = "article_locale"
    __table_args__ = (
        UniqueConstraint("locale", "slug", name="unique_locale_slug"),
    )

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    editor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    locale = Column(String(10), nullable=False)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, unique=False)  # Ensure (locale, slug) is unique manually
    description = Column(Text, nullable=False)
    content = Column(JSON, nullable=True)
    published_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    article = relationship("Article", back_populates="translations")
    editor = relationship("User")


class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    url = Column(String, nullable=False)
    type = Column(String)
    caption = Column(String)
    thumbnail = Column(String)
    controls = Column(Integer)
    source = Column(String)
    alt = Column(String)
    credit = Column(String)
