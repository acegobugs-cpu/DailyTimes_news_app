from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime
from typing import List

from database import get_db
from models import User, AuthorizedEmail
from schemas import UserCreate, UserRes, UserLoginInput, AuthorizedEmailCreate, AuthorizedEmailRes, UserUpdate
from utils.auth import hash_password, verify_password, create_access_token
from utils.mail import send_invite_email
from routes.dependencies import superadmin_required

router = APIRouter()

@router.post("/api/register/{slug}", response_model=UserRes)
def register_user(slug: str, data: UserCreate, db: Session = Depends(get_db)):
    # 1. Find authorized email with matching slug
    invite = db.query(AuthorizedEmail).filter_by(slug=slug, email=data.email).first()
    if not invite:
        raise HTTPException(status_code=403, detail="Unauthorized registration")

    # 2. Check if user already exists
    if db.query(User).filter((User.email == data.email) | (User.uname == data.uname)).first():
        raise HTTPException(status_code=400, detail="User with that email or username already exists")

    # 3. Create new user
    user = User(
        uid=f"{data.uname}_{uuid4()}",
        email=data.email,
        uname=data.uname,
        fname=data.fname,
        mname=data.mname,
        lname=data.lname,
        h_password=hash_password(data.password),
        is_superuser=False,
        created_at=datetime.utcnow()
    )
    db.add(user)
    db.delete(invite)  # remove token so it can't be reused
    db.commit()
    db.refresh(user)
    return user


@router.post("/api/login")
def login(data: UserLoginInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == data.email_or_username) | (User.uname == data.email_or_username)
    ).first()

    if not user or not verify_password(data.password, user.h_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "uid": user.uid,
            "username": user.uname,
            "is_superuser": user.is_superuser
        }
    }
@router.put("/api/users/{id}", response_model=UserRes)
def update_user(id: int, data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(superadmin_required)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.email and db.query(User).filter(User.email == data.email, User.id != id).first():
        raise HTTPException(status_code=422, detail="Email already in use")
    data_dict = data.dict(exclude_unset=True)
    non_nullable = ["fname", "lname", "uname", "email"]  # Fields requiring non-empty strings
    for field in non_nullable:
        if field in data_dict and (data_dict[field] is None or data_dict[field] == ""):
            raise HTTPException(status_code=422, detail=f"{field} cannot be empty or null")  # Reject empty strings
    if "password" in data_dict and data_dict["password"]:
        user.h_password = hash_password(data_dict.pop("password"))

    for field, value in data_dict.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.post("/api/authorize-emails", response_model=AuthorizedEmailRes)
async def authorize_email(
    data: AuthorizedEmailCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(superadmin_required)
):

    # Check if already authorized
    existing = db.query(AuthorizedEmail).filter_by(email=data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already authorized")

    invite = AuthorizedEmail(
        email=data.email,
        slug=str(uuid4()),  # Unique token for registration
        inviter_id=current_user.id
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    try:
        await send_invite_email(data.email, invite.slug)
    except Exception as e:
        # Rollback the DB if email fails
        db.delete(invite)
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to send invitation email")
    return invite

@router.get("/api/getEmails", response_model=List[AuthorizedEmailRes])
def list_authorized_emails(db:Session = Depends(get_db), current_user: User = Depends(superadmin_required)):
    return db.query(AuthorizedEmail).all()

@router.delete("/api/delEmails/{email_id}", status_code=204)
def delete_Email(email_id: int, db: Session = Depends(get_db), current_user: User = Depends(superadmin_required)):
    email = db.query(AuthorizedEmail).filter(AuthorizedEmail.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="AuthorizedEmail not found")
    db.delete(email)
    db.commit()
    return {"detail": "Email deleted"}

@router.get("/api/users", response_model=List[UserRes])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(superadmin_required)):
    return db.query(User).all()

@router.delete("/api/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(superadmin_required)):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}
