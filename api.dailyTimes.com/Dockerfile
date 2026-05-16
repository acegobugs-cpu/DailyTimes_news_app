FROM python:3.12-slim

# System dependencies for FastAPI and media handling
RUN apt update && apt install -y build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Start Uvicorn (can later be behind Nginx)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
