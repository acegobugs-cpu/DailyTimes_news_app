import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

class MinioService:
    def __init__(self):
        self.s3 = boto3.client(
            "s3",
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
        )
        self.bucket = settings.MINIO_BUCKET
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            self.s3.head_bucket(Bucket=self.bucket)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code in ['404', 'NoSuchBucket']:
                self.s3.create_bucket(Bucket=self.bucket)
            else:
                raise e

    def upload_file(self, content: bytes, filename: str, content_type: str):
        self.s3.put_object(
            Bucket=self.bucket, 
            Key=filename, 
            Body=content, 
            ContentType=content_type
        )

    def get_file(self, filename: str):
        return self.s3.get_object(Bucket=self.bucket, Key=filename)

    def delete_file(self, filename: str):
        self.s3.delete_object(Bucket=self.bucket, Key=filename)

    def list_files(self):
        return self.s3.list_objects_v2(Bucket=self.bucket)

    def check_file_exists(self, filename: str):
        try:
            self.s3.head_object(Bucket=self.bucket, Key=filename)
            return True
        except ClientError:
            return False

# Single instance for the app
minio_client = MinioService()

def get_minio() -> MinioService:
    return minio_client