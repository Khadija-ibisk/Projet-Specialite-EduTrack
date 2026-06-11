from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.database import get_db, User

SECRET_KEY = "edutrack_secret_key_2024_maroc_ynov_campus"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Permissions par rôle
ROLE_PERMISSIONS = {
    "admin":       {"read", "write", "delete", "manage_users", "import"},
    "responsable": {"read", "write", "import"},
    "formateur":   {"read", "import"},
    "viewer":      {"read"},
}

def has_permission(role: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())

def require_permission(permission: str):
    async def checker(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès refusé. Permission '{permission}' requise. Votre rôle : {current_user.role}"
            )
        return current_user
    return checker

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token invalide")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré", headers={"WWW-Authenticate": "Bearer"})
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user

def create_default_users(db: Session):
    defaults = [
        {"username": "admin",   "email": "admin@edutrack.ma",   "password": "admin123",   "role": "admin"},
        {"username": "viewer",  "email": "viewer@edutrack.ma",  "password": "viewer123",  "role": "viewer"},
        {"username": "formateur","email":"form@edutrack.ma",    "password": "form123",    "role": "formateur"},
    ]
    for u in defaults:
        if not db.query(User).filter(User.username == u["username"]).first():
            db.add(User(
                username=u["username"], email=u["email"],
                hashed_password=get_password_hash(u["password"]),
                role=u["role"]
            ))
    db.commit()
