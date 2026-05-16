import hashlib
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from botocore.exceptions import ClientError

from app.core.config import settings
from app.db.database import get_db
from app.utils.minio_client import get_minio, MinioService
from app.api.dependencies import get_current_user, media_req_form
from app.models.models import User, Media
from app.schemas.schemas import MediaReq, MediaRes

router = APIRouter()

@router.post("/upload", response_model=MediaRes, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    data: MediaReq = Depends(media_req_form),
    minio: MinioService = Depends(get_minio),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chunks = []
    total_size = 0
    chunk_size = 64 * 1024  # 64KB chunks
    
    while chunk := await file.read(chunk_size):
        total_size += len(chunk)
        if total_size > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
        chunks.append(chunk)
    
    content = b"".join(chunks)

    file_hash = hashlib.md5(content).hexdigest()
    filename = f"{file_hash}_{file.filename}"
    file_url = f"{settings.MINIO_PUBLIC_URL}/{filename}" if settings.MINIO_PUBLIC_URL else filename

    try:
        minio.upload_file(content, filename, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to storage")

    # 4. Save to Database
    new_media = Media(
        name=file.filename,
        url=file_url,
        type=data.type,
        source=data.source, 
        caption=data.caption,
        thumbnail=data.thumbnail,
        controls=data.controls,
        alt=data.alt,
        credit=data.credit
    )

    db.add(new_media)
    db.commit()
    db.refresh(new_media)

    return new_media

@router.get("/uploads")
async def list_uploaded_files(
    minio: MinioService = Depends(get_minio),
    current_user: User = Depends(get_current_user)
):
    response = minio.list_files()
    files = response.get('Contents', [])
    
    # Build URLs based on public URL or keys
    base_url = settings.MINIO_PUBLIC_URL or ""
    file_urls = [f"{base_url}/{obj['Key']}" for obj in files]
    return {"files": file_urls}

@router.get("/upload/{filename}")
async def get_file(
    filename: str,
    minio: MinioService = Depends(get_minio)
):
    try:
        obj = minio.get_file(filename)
        return StreamingResponse(
            obj['Body'], 
            media_type=obj.get('ContentType', 'application/octet-stream')
        )
    except ClientError:
        raise HTTPException(status_code=404, detail="File not found")

@router.put("/upload/{filename}")
async def replace_file(
    filename: str,
    file: UploadFile = File(...),
    minio: MinioService = Depends(get_minio),
    current_user: User = Depends(get_current_user)
) -> dict:
    if not minio.check_file_exists(filename):
        raise HTTPException(status_code=404, detail="File not found")

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
    minio.upload_file(content, filename, file.content_type)
    return {"message": "File replaced", "filename": filename}

@router.delete("/upload/{filename}")
async def delete_file(
    filename: str,
    minio: MinioService = Depends(get_minio),
    current_user: User = Depends(get_current_user)
):
    if not minio.check_file_exists(filename):
        raise HTTPException(status_code=404, detail="File not found")
    
    minio.delete_file(filename)
    return Response(status_code=204)