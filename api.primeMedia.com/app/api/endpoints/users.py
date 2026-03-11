from fastapi import APIRouter, HTTPException, Depends, Response, Request, Cookie
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime
from typing import List
from jose import JWTError

from app.db.database import get_db
from app.models.models import User, AuthorizedEmail, RefreshToken
import hashlib
from app.schemas.schemas import UserCreate, UserRes, UserLoginInput, AuthorizedEmailCreate, AuthorizedEmailRes, UserUpdate, TokenVerify
from app.core.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_access_token
from app.utils.mail import Mail
from app.api.dependencies import superadmin_required, store_refresh_token

router = APIRouter()


@router.post("/register/{slug}", response_model=UserRes)
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


@router.post("/login")
def login(
    request: Request,
    response: Response,  # Add this to set cookies
    data: UserLoginInput, 
    db: Session = Depends(get_db)
):
    request_ip = request.client.host if request.client else "unknown"
    request_user_agent = request.headers.get("user-agent", "unknown") if request.headers else "unknown"
 
    user = db.query(User).filter(
        (User.email == data.email_or_username) | (User.uname == data.email_or_username)
    ).first()

    if not user or not verify_password(data.password, user.h_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": str(user.id)})
    raw_refresh, hashed_refresh, expires_at = create_refresh_token()

    store_refresh_token(db, user.id, hashed_refresh, expires_at=expires_at, ip_address=request_ip, user_agent=request_user_agent)
    
    return {
        "access_token": access_token,  # Still return for debugging, can remove later
        "refresh_token": raw_refresh,
        "user": {
            "id": user.id,
            "uid": user.uid,
            "username": user.uname,
            "email": user.email,
            "is_superuser": user.is_superuser
        }
    }


@router.get("/me")
def get_current_user(access_token: str = Cookie(None), db: Session = Depends(get_db)):

    if not access_token:
        return {"user": None}

    try:
        payload = decode_access_token(access_token)
        user_id = payload.get("sub")
        if not user_id:
            return {"user": None}

        # Fetch fresh user from DB
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            return {"user": None}

        return {
            "user": {
                "id": user.id,
                "uid": user.uid,
                "username": user.uname,
                "email": user.email,
                "is_superuser": user.is_superuser,
            }
        }

    except JWTError:
        return {"user": None}

@router.post("/refresh")
async def refresh_token(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    old_token_plain = body.get("refresh_token")
    if not old_token_plain:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    old_token_hash = hashlib.sha256(old_token_plain.encode()).hexdigest()
    old_token = db.query(RefreshToken).filter_by(token_hash=old_token_hash).first()

    if not old_token or old_token.revoked or old_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Generate new refresh token
    new_token_plain, new_token_hash, new_expires_at = create_refresh_token()

    # Store new token in DB
    new_token = RefreshToken(
        user_id=old_token.user_id,
        token_hash=new_token_hash,
        expires_at=new_expires_at,
        revoked=False,
        replaced_by_id=None
    )
    db.add(new_token)
    db.flush()

    # Revoke old token and link to new
    old_token.revoked = True
    old_token.replaced_by_id = new_token.id

    db.commit()
    db.refresh(new_token)

    user = db.query(User).filter_by(id=old_token.user_id).first()


    new_access_token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": new_access_token,  # we’ll issue this next
        "refresh_token": new_token_plain,
        "user": {
            "id": user.id, 
            "uid": user.uid,
            "username": user.uname,
            "email": user.email,  
            "is_superuser": user.is_superuser}
    }

@router.post("/verify")
def verify_token(payload: TokenVerify, db=Depends(get_db)):

    token = payload.token
    try:
        decoded = decode_access_token(token)
        user_id = decoded.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Make sure user still exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return {"valid": True}

    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

@router.post("/logout")
def logout(response: Response):
    # Clear the token cookie
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}

    
@router.put("/users/{id}", response_model=UserRes)
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


@router.post("/authorize-emails", response_model=AuthorizedEmailRes)
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
        await Mail.send_invite_email(data.email, invite.slug)
    except Exception as e:
        # Rollback the DB if email fails
        db.delete(invite)
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to send invitation email")
    return invite

@router.get("/getEmails", response_model=List[AuthorizedEmailRes])
def list_authorized_emails(db:Session = Depends(get_db), current_user: User = Depends(superadmin_required)):
    return db.query(AuthorizedEmail).all()

@router.delete("/delEmails/{email_id}", status_code=204)
def delete_Email(email_id: int, db: Session = Depends(get_db), current_user: User = Depends(superadmin_required)):
    email = db.query(AuthorizedEmail).filter(AuthorizedEmail.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="AuthorizedEmail not found")
    db.delete(email)
    db.commit()
    return None

@router.get("/users", response_model=List[UserRes])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(superadmin_required)):
    return db.query(User).all()

@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(superadmin_required)):
    user = db.query(User).filter(User.id == user_id).first()

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}
