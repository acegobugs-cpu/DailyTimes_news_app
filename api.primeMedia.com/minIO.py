import hashlib
import os
from fastapi import APIRouter, FastAPI, File, UploadFile, Depends, HTTPException, Response
from fastapi.responses import JSONResponse, StreamingResponse
import boto3
from botocore.exceptions import ClientError
from models import User
from routes.dependencies import get_current_user


router = APIRouter()

# --- Configuration ---
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
BUCKET = os.getenv("MINIO_BUCKET")

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB limit

if not all([MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, BUCKET]):
    raise RuntimeError("Missing required MinIO environment variables")

s3 = boto3.client(
    "s3",
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
)
try:
    s3.head_bucket(Bucket=BUCKET)
except ClientError as e:
    error_code = e.response.get('Error', {}).get('Code')
    if error_code == '404' or error_code == 'NoSuchBucket':
        s3.create_bucket(Bucket=BUCKET)
    else:
        raise
    s3.head_bucket(Bucket=BUCKET)
except ClientError:
    s3.create_bucket(Bucket=BUCKET)

# --- Routes ---

@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
    file_hash = hashlib.md5(content).hexdigest()
    ext = file.filename.split(".")[-1]
    filename = f"{file_hash}_{file.filename}"

    # Check if file exists in MinIO
    try:
        s3.head_object(Bucket=BUCKET, Key=filename)
        return JSONResponse(content={"url": f"/api/upload/{filename}"}, status_code=200)
    except ClientError:
        # File doesn't exist, proceed to upload
        s3.put_object(Bucket=BUCKET, Key=filename, Body=content, ContentType=file.content_type)
        return JSONResponse(content={"url": f"/api/upload/{filename}"}, status_code=201)

@router.get("/api/uploads")
async def list_uploaded_files(current_user: User = Depends(get_current_user)):
    try:
        response = s3.list_objects_v2(Bucket=BUCKET)
        files = response.get('Contents', [])
        file_urls = [f"{MINIO_PUBLIC_URL}{obj['Key']}" for obj in files]
        return {"files": file_urls}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/upload/{filename}")
async def get_file(filename: str):
    try:
        # We stream the file from MinIO to the client
        obj = s3.get_object(Bucket=BUCKET, Key=filename)
        return StreamingResponse(
            obj['Body'], 
            media_type=obj.get('ContentType', 'application/octet-stream')
        )
    except ClientError:
        raise HTTPException(status_code=404, detail="File not found")

@router.put("/api/upload/{filename}")
async def replace_file(
    filename: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Check existence
    try:
        s3.head_object(Bucket=BUCKET, Key=filename)
    except ClientError:
        raise HTTPException(status_code=404, detail="File not found")

    content = await file.read()
    s3.put_object(Bucket=BUCKET, Key=filename, Body=content, ContentType=file.content_type)
    return {"message": "File replaced", "url": f"/api/upload/{filename}"}

@router.delete("/api/upload/{filename}")
async def delete_file(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    try:
        s3.head_object(Bucket=BUCKET, Key=filename)
        s3.delete_object(Bucket=BUCKET, Key=filename)
        # Standard REST: Return 204 for successful deletion
        return Response(status_code=204)
    except ClientError:
        raise HTTPException(status_code=404, detail="File not found")