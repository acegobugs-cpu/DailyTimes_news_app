from __future__ import annotations
from pydantic import BaseModel, EmailStr, constr
from typing import List, Optional
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