from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User, RefreshToken
from datetime import datetime
from jose import jwt, JWTError
from utils.auth import SECRET_KEY

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")
ALGORITHM = "HS256"


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
):

    token = request.cookies.get("token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user


def superadmin_required(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Unauthorized (superadmin only)")
    return current_user

def editor_required(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Editor access only")
    return current_user

def store_refresh_token(db: Session, user_id: int, token_hash: str, expires_at: datetime,
                        ip_address: str = None, user_agent: str = None):
    refresh = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked=False,
        replaced_by_id=None,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(refresh)
    db.commit()
    db.refresh(refresh)
    return refresh.id