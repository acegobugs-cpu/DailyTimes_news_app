from database import SessionLocal
from models import User
from utils.auth import hash_password
import uuid

def create_superuser():
    db = SessionLocal()
    try:
        superuser = User(
            uid=str(uuid.uuid4()),
            fname="Super",
            mname="",
            lname="Admin",
            uname="root",
            email="admin@news.com",
            h_password=hash_password("password123"),
            is_superuser=True,
        )
        db.add(superuser)
        db.commit()
        print("Superuser created successfully!")
    except Exception as e:
        print("Error creating superuser:", e)
    finally:
        db.close()

if __name__ == "__main__":
    create_superuser()
