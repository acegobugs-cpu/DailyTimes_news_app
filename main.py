from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile, APIRouter, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List
from database import get_db
from models import User, Article, Category, article_category
from schemas import ArticleRes, CategoryRes, ArticleCreate, CategoryCreate
from fastapi.responses import JSONResponse
import os
from datetime import datetime
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from routes import auth 

app = FastAPI()
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, tags=["Auth"])


app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return JSONResponse(content={"url": f"/{filepath}"}, status_code=201)

@app.get("/api/articles", response_model=List[ArticleRes])
async def get_articles(
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("published_at", pattern="^(published_at|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$")
):
    query = db.query(Article).options(joinedload(Article.categories))
    sort_column = getattr(Article, sort_by)
    query = query.order_by(desc(sort_column) if order == "desc" else sort_column)
    return query.limit(limit).all()

@app.get("/api/articles/{id}", response_model=ArticleRes)
async def get_article(id: int, db: Session = Depends(get_db)):
    article = db.query(Article).options(joinedload(Article.categories)).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@app.get("/api/articles/slug/{slug}", response_model=ArticleRes)
async def get_article_by_slug(slug: str, db: Session = Depends(get_db)):
    article = db.query(Article).options(joinedload(Article.categories)).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@app.get("/api/categories", response_model=List[CategoryRes])
async def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@app.get("/api/categories/{id}", response_model=CategoryRes)
async def get_category(id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@app.get("/api/categories/slug/{slug}", response_model=CategoryRes)
async def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@app.get("/api/articles/category/{category_name}", response_model=List[ArticleRes])
async def get_articles_by_category(
    category_name: str,
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100)
):
    category = db.query(Category).filter(Category.name == category_name).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category.articles[:limit]

@app.get("/api/categories/{slug}/articles", response_model=List[ArticleRes])
async def get_articles_by_category(slug: str, limit: int = 10, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    articles = (
        db.query(Article)
        .join(article_category)
        .filter(article_category.c.category_id == category.id)
        .limit(limit)
        .all()
    )
    return articles

@app.post("/api/articles", response_model=ArticleRes)
async def create_article(article: ArticleCreate, db: Session = Depends(get_db)):
    db_article = Article(**article.dict(exclude={"category_ids"}))
    categories = db.query(Category).filter(Category.id.in_(article.category_ids)).all()
    if not categories:
        raise HTTPException(status_code=400, detail="Invalid category IDs")
    db_article.categories = categories
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article

@app.post("/api/categories", response_model=CategoryRes)
async def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    db_category = Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.delete("/api/articles/{article_id}", status_code=204)
async def delete_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return None

@app.delete("/api/categories/{category_id}", status_code=204)
async def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return None