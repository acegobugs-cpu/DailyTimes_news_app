from fastapi import APIRouter
from app.api.endpoints import files, articles, categories, users

api_router = APIRouter()

# By adding prefix="/api", we satisfy your "no change to endpoint" requirement
api_router.include_router(users.router, prefix="/api", tags=["auth"])
api_router.include_router(files.router, prefix="/api", tags=["files"])
api_router.include_router(articles.router, prefix="/api", tags=["articles"])
api_router.include_router(categories.router, prefix="/api", tags=["categories"])