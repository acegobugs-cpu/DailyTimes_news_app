from __future__ import annotations
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    slug: str

class CategoryCreate(CategoryBase):
    pass

class CategoryRes(CategoryBase):
    id: int
    articles: Optional[List["ArticleBase"]] = []

    class Config:
        from_attributes = True

class ArticleBase(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    media: Optional[str] = None  # JSON string
    content: Optional[str] = None  # JSON string
    published_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    tag: Optional[str] = None
    is_published: Optional[int] = 0

class ArticleCreate(ArticleBase):
    category_ids: List[int]

class ArticleRes(ArticleBase):
    id: int
    categories: Optional[List[CategoryBase]] = []

    class Config:
        from_attributes = True