from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile, APIRouter, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, text

from app.api.dependencies import get_current_user
from app.db.database import get_db  # Updated path
from app.models.models import Article, Category, article_category, ArticleLocale, User # Updated path
from app.schemas.schemas import ArticleRes, CategoryRes, ArticleCreate, CategoryCreate, CategoryUpdate, ArticleUpdate, ArticleLocaleRes, ArticleLocaleCreate # Updated path

router = APIRouter()

@router.get("/search", response_model=List[ArticleRes])
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

@router.get("/articles", response_model=List[ArticleRes])
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
        query = query.filter(
            Article.translations.any(locale=locale) |
            Article.translations.any(locale=DEFAULT_LOCALE)
        )

    sort_column = getattr(Article, sort_by)
    query = query.order_by(desc(sort_column) if order == "desc" else sort_column)

    articles = query.limit(limit).all()

    for article in articles:
        if not locale:
            continue

        locales = [t.locale for t in article.translations]

        if locale in locales:
            article.translations = [t for t in article.translations if t.locale == locale]
        elif DEFAULT_LOCALE in locales:
            article.translations = [t for t in article.translations if t.locale == DEFAULT_LOCALE]
        else:
            article.translations = []

    return articles


@router.get("/articles/id={id}", response_model=ArticleRes)
async def get_article(id: int, db: Session = Depends(get_db)):
    article = db.query(Article).options(joinedload(Article.categories)).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.get("/articles/{slug}", response_model=ArticleRes)
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


@router.get("/articles/category/{category}", response_model=List[ArticleRes])
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


@router.get("/categories/{slug}/articles", response_model=List[ArticleRes])
async def get_category_articles(slug: str, limit: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
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


####################################################----------POST----------####################################################


@router.post("/articles", response_model=ArticleRes)
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


@router.post("/locale", response_model=ArticleLocaleRes)
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


@router.patch("/articles/{article_id}")
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


####################################################----------POST----------####################################################


@router.delete("/articles/{article_id}", status_code=204)
async def delete_article(article_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return None

@router.delete("/delete/locale/{locale_id}", status_code=204)
async def delete_locale(locale_id: int, db:Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    locale = db.query(ArticleLocale).filter(ArticleLocale.id == locale_id).first()
    if not locale:
        raise HTTPException(status_code=404, detail="Locale not found")
    db.delete(locale)
    db.commit()
    return None