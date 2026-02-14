from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile, APIRouter, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, text
from typing import List, Optional
from database import get_db
from models import User, Article, Category, article_category, ArticleLocale
from schemas import ArticleRes, CategoryRes, ArticleCreate, CategoryCreate, CategoryUpdate, ArticleUpdate, ArticleLocaleRes, ArticleLocaleCreate
from fastapi.responses import JSONResponse, FileResponse
import os
import hashlib
import shutil
from datetime import datetime
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from routes import auth 
from routes.dependencies import get_current_user
from utils.rate_limit import RateLimitMiddleware

app = FastAPI()
# Rate limiting: global default and path-specific stricter limits
app.add_middleware(
    RateLimitMiddleware,
    default_limit="100/minute",
    path_limits=[
        (r"^/api/login$", "10/minute"),
        (r"^/api/register/.*$", "5/minute"),
        (r"^/api/authorize-emails$", "15/minute"),
        (r"^/api/upload(?:/.*)?$", "20/minute"),
        (r"^/api/search$", "60/minute"),
    ],
)
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://the-daily-times-com.vercel.app",
        "https://strong-zabaione-697d0a.netlify.app",
        "http://localhost:3000",
        "http://localhost:5173",
        ],  # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router, tags=["Auth"])

# frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
# app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read()
    file_hash = hashlib.md5(content).hexdigest()
    original_name = file.filename
    ext = original_name.split(".")[-1]

    # Create a deterministic filename using hash
    filename = f"{file_hash}_{original_name}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # If file already exists, return the existing path
    if os.path.exists(filepath):
        return JSONResponse(content={"url": f"/{filepath}"}, status_code=200)

    # Save the file if it doesn't exist
    with open(filepath, "wb") as buffer:
        buffer.write(content)

    return JSONResponse(content={"url": f"/{filepath}"}, status_code=201)


@app.get("/api/uploads")
async def list_uploaded_files():
    try:
        files = os.listdir(UPLOAD_DIR)
        file_urls = [f"/{UPLOAD_DIR}/{filename}" for filename in files if os.path.isfile(os.path.join(UPLOAD_DIR, filename))]
        return JSONResponse(content={"files": file_urls}, status_code=200)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Upload directory not found")


@app.get("/api/upload/{filename}")
async def get_file(filename: str):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(filepath, media_type="application/octet-stream", filename=filename)


@app.put("/api/upload/{filename}")
async def replace_file(
    filename: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    content = await file.read()
    with open(filepath, "wb") as buffer:
        buffer.write(content)

    return JSONResponse(content={"message": "File replaced", "url": f"/{filepath}"}, status_code=200)


@app.delete("/api/upload/{filename}")
async def delete_file(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    os.remove(filepath)
    return JSONResponse(content={"message": "File deleted"}, status_code=200)



@app.get("/api/search", response_model=List[ArticleRes])
def search_articles(q: str, db: Session = Depends(get_db)):
    # Step 1: Find matching article_locale entries
    sql = text("""
        SELECT id, article_id FROM article_locale
        WHERE MATCH(title, description) AGAINST(:q IN NATURAL LANGUAGE MODE)
    """)
    rows = db.execute(sql, {"q": q}).fetchall()

    # Step 2: Build a map of article_id -> matching locale_id
    article_to_locale = {row.article_id: row.id for row in rows}
    matched_article_ids = list(article_to_locale.keys())

    # Step 3: Fetch articles
    articles = db.query(Article).filter(Article.id.in_(matched_article_ids)).all()

    # Step 4: Filter translations to only include the matched locale
    for article in articles:
        matched_locale_id = article_to_locale.get(article.id)
        article.translations = [
            t for t in article.translations if t.id == matched_locale_id
        ]

    return articles



@app.get("/api/articles", response_model=List[ArticleRes])
async def get_articles(
    db: Session = Depends(get_db),
    locale: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("published_at", pattern="^(published_at|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$")
):
    DEFAULT_LOCALE = 'om'

    query = db.query(Article).options(joinedload(Article.categories))
    if locale:
        # Only filter articles that have the requested locale or fallback
        query = query.filter(
            Article.translations.any(locale=locale) |
            Article.translations.any(locale=DEFAULT_LOCALE)
        )

    sort_column = getattr(Article, sort_by)
    query = query.order_by(desc(sort_column) if order == "desc" else sort_column)

    articles = query.limit(limit).all()

    for article in articles:
        if not locale:
            # No locale specified: return all translations
            continue

        locales = [t.locale for t in article.translations]

        if locale in locales:
            article.translations = [t for t in article.translations if t.locale == locale]
        elif DEFAULT_LOCALE in locales:
            article.translations = [t for t in article.translations if t.locale == DEFAULT_LOCALE]
        else:
            article.translations = []

    return articles



@app.get("/api/articles/id={id}", response_model=ArticleRes)
async def get_article(id: int, db: Session = Depends(get_db)):
    article = db.query(Article).options(joinedload(Article.categories)).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@app.get("/api/articles/{slug}", response_model=ArticleRes)
async def get_article_by_slug(
    slug: str,
    locale: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    DEFAULT_LOCALE = 'om'

    # Fetch the article that has a translation with the matching slug
    article = (
        db.query(Article)
        .join(Article.translations)
        .options(joinedload(Article.categories), joinedload(Article.translations))
        .filter(ArticleLocale.slug == slug)
        .first()
    )

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if not locale:
        # Return all translations if no locale provided
        return article

    # Try to get the matching locale translation
    matched = [t for t in article.translations if t.locale == locale]
    fallback = [t for t in article.translations if t.locale == DEFAULT_LOCALE]

    if matched:
        article.translations = matched
    elif fallback:
        article.translations = fallback
    else:
        article.translations = []

    return article



# @app.get("/api/article", response_model=List[ArticleRes])
# async def get_articles_by_locale(locale: str = Query(...), db: Session = Depends(get_db)):
#     DEFAULT_LOCALE = 'om'

#     articles = db.query(Article).filter(Article.translations.any(locale=locale)).all()

#     if not articles:
#         # Fallback if no articles found in requested locale
#         locale = DEFAULT_LOCALE
#         articles = db.query(Article).filter(Article.translations.any(locale=locale)).all()

#     for article in articles:
#         # Only keep the translation matching the final locale used
#         article.translations = [t for t in article.translations if t.locale == locale]

#     return articles


# @app.put("/api/articles/{id}", response_model=ArticleRes)
# def update_article(id: int, data: ArticleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
#     if not current_user.is_superuser and not current_user.is_editor:
#         raise HTTPException(status_code=403, detail="Not authorized")

#     article = db.query(Article).filter(Article.id == id).first()
#     if not article:
#         raise HTTPException(status_code=404, detail="Article not found")

#     for field, value in data.dict(exclude_unset=True).items():
#         setattr(article, field, value)

#     db.commit()
#     db.refresh(article)
#     return article


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

@app.get("/api/articles/category/{category}", response_model=List[ArticleRes])
async def get_articles_by_category(
    category: str,
    db: Session = Depends(get_db),
    locale: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100)
):
    DEFAULT_LOCALE = 'om'

    category_obj = (
        db.query(Category)
        .options(joinedload(Category.articles).joinedload(Article.translations))
        .filter(Category.slug == category)
        .first()
    )

    if not category_obj:
        raise HTTPException(status_code=404, detail="Category not found")

    filtered_articles = []

    for article in category_obj.articles:
        if not locale:
            # No locale given, return full translation list
            filtered_articles.append(article)
            continue

        locales = [t.locale for t in article.translations]

        if locale in locales:
            article.translations = [t for t in article.translations if t.locale == locale]
        elif DEFAULT_LOCALE in locales:
            article.translations = [t for t in article.translations if t.locale == DEFAULT_LOCALE]
        else:
            article.translations = []

        filtered_articles.append(article)

    return filtered_articles[:limit]


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
async def create_article(article: ArticleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Step 1: Create Article (excluding categories)
    db_article = Article(
        tag=article.tag,
        media=article.media,
    )

    # Step 2: Attach valid categories
    categories = db.query(Category).filter(Category.id.in_(article.category_ids)).all()
    if len(categories) != len(article.category_ids):
        raise HTTPException(status_code=400, detail="One or more invalid category IDs")
    db_article.categories = categories

    # Step 3: Add translations
    for t in article.translations:
        translation = ArticleLocale(
            locale=t.locale,
            title=t.title,
            slug=t.slug,
            editor_id=t.editor_id,
            description=t.description,
            content=t.content,
            published_at=t.published_at,
            article=db_article  # link to parent article
        )
        db.add(translation)

    # Step 4: Commit everything
    db.add(db_article)
    db.commit()
    db.refresh(db_article)

    return db_article

@app.post("/api/locale", response_model=ArticleLocaleRes)
def add_article_locale(locale_data: ArticleLocaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Check if article exists
    article = db.query(Article).filter(Article.id == locale_data.article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # 2. Check for duplicate locale for same article
    existing = db.query(ArticleLocale).filter_by(
        article_id=locale_data.article_id,
        locale=locale_data.locale
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Translation already exists for this locale")
    
    # 3. Create new ArticleLocale
    new_locale = ArticleLocale(**locale_data.dict())
    db.add(new_locale)
    db.commit()
    db.refresh(new_locale)
    return new_locale

@app.patch("/api/articles/{article_id}")
def update_article(article_id: int, update_data: ArticleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get the article
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Update main fields
    if update_data.tag is not None:
        article.tag = update_data.tag
    if update_data.media is not None:
        article.media = update_data.media
    if update_data.updated_at is not None:
        article.updated_at = update_data.updated_at

    # Update categories if given
    if update_data.category_ids is not None:
        categories = db.query(Category).filter(Category.id.in_(update_data.category_ids)).all()
        article.categories = categories

    # Update translations by locale
    if update_data.translations:
        for locale_code, locale_data in update_data.translations.items():
            translation = next(
                (t for t in article.translations if t.id == locale_data.id),
                None
            )

            if translation:
                # Update existing translation
                if locale_data.locale is not None:
                    translation.locale = locale_data.locale
                if locale_data.title is not None:
                    translation.title = locale_data.title
                if locale_data.slug is not None:
                    translation.slug = locale_data.slug
                if locale_data.description is not None:
                    translation.description = locale_data.description
                if locale_data.content is not None:
                    translation.content = locale_data.content
                if locale_data.updated_at is not None:
                    translation.updated_at = locale_data.updated_at
            else:
                # Create new translation if it doesn't exist
                new_translation = ArticleLocale(
                    article_id=article.id,
                    locale=locale_code,
                    title=locale_data.title,
                    slug=locale_data.slug,
                    description=locale_data.description,
                    content=locale_data.content,
                    updated_at=locale_data.updated_at,
                )
                db.add(new_translation)

    db.commit()
    db.refresh(article)
    return {"message": "Article updated successfully", "article_id": article.id}

@app.post("/api/categories", response_model=CategoryRes)
async def create_category(category: CategoryCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_category = Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.delete("/api/articles/{article_id}", status_code=204)
async def delete_article(article_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return None

@app.delete("/api/delete/locale/{locale_id}", status_code=204)
async def delete_locale(locale_id: int, db:Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    locale = db.query(ArticleLocale).filter(ArticleLocale.id == locale_id).first()
    if not locale:
        raise HTTPException(status_code=404, detail="Locale not found")
    db.delete(locale)
    db.commit()
    return None

@app.put("/api/categories/{id}", response_model=CategoryRes)
def update_category(id: int, data: CategoryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")

    category = db.query(Category).filter(Category.id == id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


@app.delete("/api/categories/{category_id}", status_code=204)
async def delete_category(category_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return None