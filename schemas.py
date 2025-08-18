from __future__ import annotations
from pydantic import BaseModel, EmailStr, constr, ConfigDict, Json
from typing import List, Optional, Any, Dict
from datetime import datetime


class UserBase(BaseModel):
    fname:str
    mname:Optional[str] = None
    lname:str
    uname: str
    email: EmailStr

class UserCreate(UserBase):
    password: constr(min_length=8)

class UserUpdate(BaseModel):
    fname: Optional[str]
    mname: Optional[str]
    lname: Optional[str]
    email: Optional[EmailStr]
    uname: Optional[str]
    password: Optional[str] = None
    is_superuser: Optional[bool]

    class Config:
        from_attributes = True

class UserLoginInput(BaseModel):
    email_or_username: str
    password: str

class UserRes(UserBase):
    id: int
    uid: str
    fname: str
    lname: str
    uname: str
    is_superuser: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AuthorizedEmailBase (BaseModel):
    email: EmailStr

class AuthorizedEmailCreate(AuthorizedEmailBase):
    pass

class AuthorizedEmailRes(AuthorizedEmailBase):
    id: int
    slug: str
    used: bool
    created_at: datetime
    inviter_id: Optional[int]

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    id: int
    name: str
    slug: str

class CategoryUpdate(BaseModel):
    name: Optional[str]
    slug: Optional[str]

    class Config:
        from_attributes = True

class CategoryCreate(CategoryBase):
    pass

class CategoryRes(CategoryBase):
    articles: Optional[List["ArticleBase"]] = []

    class Config:
        from_attributes = True

class ArticleLocaleBase(BaseModel):
    locale: str
    title: str
    slug: str
    editor_id: int
    description: str
    content: Optional[dict] = None # JSON string
    published_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
class ArticleLocaleCreate(ArticleLocaleBase):
    article_id: Optional[int] = None
    pass

class ArticleLocaleRes(ArticleLocaleBase):
    id:int
    article_id: int
    published_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ArticleLocaleUpdate(BaseModel):
    title: Optional[str]
    slug: Optional[str]
    description: Optional[str]
    content: Optional[dict] = None
    updated_at: Optional[datetime] = None

class ArticleBase(BaseModel):
    id:int
    tag: str
    media: Optional[dict] = None  # JSON
    translations: List[ArticleLocaleCreate]

class ArticleCreate(BaseModel):
    tag: str
    media: Optional[dict] = None  # JSON
    category_ids: List[int]
    translations: List[ArticleLocaleCreate]

class ArticleUpdate(BaseModel):
    tag: Optional[str]
    media: Optional[dict] = None # e.g., [{ "type": "image", "url": "..."}]
    updated_at: Optional[datetime] = None
    
    category_ids: Optional[List[int]]
    translations: Optional[Dict[str, ArticleLocaleUpdate]]

    class Config:
        from_attributes = True

class ArticleRes(ArticleBase):
    id: int
    categories: Optional[List[CategoryBase]] = []
    translations: List[ArticleLocaleRes]
    published_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

