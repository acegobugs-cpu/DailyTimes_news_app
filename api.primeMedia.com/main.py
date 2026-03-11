from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.utils.rate_limit import RateLimitMiddleware
from app.api.v1.api import api_router

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
        "http://localhost:3001",
        ],  # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
# app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

app.include_router(api_router)