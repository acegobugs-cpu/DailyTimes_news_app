from fastapi import FastAPI, File, UploadFile
import boto3
import os

app = FastAPI()

s3 = boto3.client(
    "s3",
    endpoint_url=f"http://{os.getenv('MINIO_ENDPOINT')}:9000",
    aws_access_key_id=os.getenv("MINIO_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("MINIO_SECRET_KEY"),
)

BUCKET = os.getenv("MINIO_BUCKET")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    s3.upload_fileobj(file.file, BUCKET, file.filename)
    return {"filename": file.filename, "url": f"/{BUCKET}/{file.filename}"}
