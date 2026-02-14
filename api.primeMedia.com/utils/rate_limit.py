import asyncio
import re
import time
from collections import deque, defaultdict
from typing import Deque, Dict, Tuple, List, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Lightweight in-memory rate limiting middleware for FastAPI/Starlette.

    - Limits are enforced per client IP.
    - Supports a global default limit and optional per-path overrides via regex.
    - Rate syntax examples: "100/minute", "10/second", "300/hour", "60/5m", "5/30s".

    WARNING: This uses in-process memory. For multi-worker deployments or
    distributed setups, use a shared backend (e.g., Redis) and a library like
    fastapi-limiter or slowapi with a proper storage backend.
    """

    def __init__(
        self,
        app,
        default_limit: str = "100/minute",
        path_limits: Optional[List[Tuple[str, str]]] = None,
        respect_x_forwarded_for: bool = True,
    ):
        super().__init__(app)
        self.respect_x_forwarded_for = respect_x_forwarded_for
        self.default_limit = self._parse_rate(default_limit)
        self.path_limits = []
        if path_limits:
            for pattern, rate in path_limits:
                self.path_limits.append((re.compile(pattern), self._parse_rate(rate)))
        self.lock = asyncio.Lock()
        # storage: key -> deque[timestamps]
        self.storage: Dict[str, Deque[float]] = defaultdict(deque)

    def _parse_rate(self, rate: str) -> Tuple[int, int, str]:
        """Parse a rate string into (limit, window_seconds, original_str)."""
        s = rate.strip().lower()
        if "/" not in s:
            raise ValueError(f"Invalid rate format: {rate}")
        count_str, per = s.split("/", 1)
        try:
            count = int(count_str)
        except ValueError:
            raise ValueError(f"Invalid rate count: {count_str}")
        per = per.strip()
        window: Optional[int] = None

        if per in ("s", "sec", "second", "seconds"):
            window = 1
        elif per in ("m", "min", "minute", "minutes"):
            window = 60
        elif per in ("h", "hour", "hours"):
            window = 3600
        else:
            # try parse like "60s" "15m" "1h" or multi-second/minute inputs like "30s", "5m"
            match = re.fullmatch(r"(\d+)\s*([smh])", per)
            if match:
                val = int(match.group(1))
                unit = match.group(2)
                window = val * (1 if unit == "s" else 60 if unit == "m" else 3600)

        if window is None:
            raise ValueError(f"Invalid rate window: {per}")
        return (count, window, f"{count}/{per}")

    def _client_ip(self, request: Request) -> str:
        if self.respect_x_forwarded_for:
            xff = request.headers.get("x-forwarded-for")
            if xff:
                # could be a list of ips
                ip = xff.split(",")[0].strip()
                if ip:
                    return ip
        client = request.client
        return client.host if client else "unknown"

    async def dispatch(self, request: Request, call_next):
        now = time.time()
        ip = self._client_ip(request)
        path = request.url.path

        # determine applicable limits: path-specific(s) and global
        applicable: List[Tuple[str, int, int, str]] = []
        for regex, (limit, window, original) in self.path_limits:
            if regex.match(path):
                applicable.append((f"path:{regex.pattern}", limit, window, original))
        # always enforce default/global
        glimit, gwindow, gorig = self.default_limit
        applicable.append(("global", glimit, gwindow, gorig))

        # Check and update counters atomically
        async with self.lock:
            for scope, limit, window, original in applicable:
                key = f"{ip}:{scope}"
                dq = self.storage[key]
                # drop old timestamps
                while dq and (now - dq[0]) >= window:
                    dq.popleft()
                if len(dq) >= limit:
                    retry_after = max(1, int(window - (now - dq[0])))
                    headers = {
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Window": str(window),
                        "X-RateLimit-Scope": scope,
                    }
                    return JSONResponse(
                        {
                            "detail": "Rate limit exceeded",
                            "scope": scope,
                            "limit": limit,
                            "window_seconds": window,
                        },
                        status_code=429,
                        headers=headers,
                    )
            # if allowed, record timestamps
            for scope, limit, window, original in applicable:
                key = f"{ip}:{scope}"
                self.storage[key].append(now)

        response: Response = await call_next(request)
        return response
