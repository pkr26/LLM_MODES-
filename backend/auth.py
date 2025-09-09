"""
Authentication and authorization module.

This module handles user authentication, password management,
JWT token generation/validation, and security-related operations.
"""

import logging
import secrets
import hashlib
import io
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Union

import pyotp
import qrcode
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from itsdangerous import URLSafeTimedSerializer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User, RefreshToken, PasswordHistory, EmailVerification, PasswordReset

logger = logging.getLogger(__name__)

# Authentication utilities
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
serializer = URLSafeTimedSerializer(settings.secret_key)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its hash.
    
    Args:
        plain_password: The plain text password
        hashed_password: The hashed password to verify against
        
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: The plain text password to hash
        
    Returns:
        str: The hashed password
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: The payload data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        str: The encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc).timestamp(),
        "type": "access"
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(user_id: int, db: Session, request: Request = None) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host
        user_agent = request.headers.get("user-agent")
    
    db_refresh_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(db_refresh_token)
    db.commit()
    
    return token

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def check_password_history(db: Session, user_id: int, new_password: str) -> bool:
    """Check if password was used recently"""
    password_history = db.query(PasswordHistory).filter(
        PasswordHistory.user_id == user_id
    ).order_by(PasswordHistory.created_at.desc()).limit(PASSWORD_HISTORY_COUNT).all()
    
    for old_password in password_history:
        if verify_password(new_password, old_password.hashed_password):
            return False
    return True

def add_password_to_history(db: Session, user_id: int, hashed_password: str):
    """Add password to history and clean old ones"""
    password_entry = PasswordHistory(
        user_id=user_id,
        hashed_password=hashed_password
    )
    db.add(password_entry)
    
    # Clean old password history
    old_passwords = db.query(PasswordHistory).filter(
        PasswordHistory.user_id == user_id
    ).order_by(PasswordHistory.created_at.desc()).offset(PASSWORD_HISTORY_COUNT).all()
    
    for old_password in old_passwords:
        db.delete(old_password)
    
    db.commit()

def is_account_locked(user: User) -> bool:
    """Check if account is locked due to failed login attempts"""
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        return True
    return False

def increment_failed_login(db: Session, user: User):
    """Increment failed login attempts and lock account if necessary"""
    user.failed_login_attempts += 1
    
    if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
    
    db.commit()

def reset_failed_login_attempts(db: Session, user: User):
    """Reset failed login attempts after successful login"""
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

def generate_verification_token(user_id: int) -> str:
    """Generate email verification token"""
    return serializer.dumps(user_id, salt='email-verification')

def verify_verification_token(token: str, max_age: int = 3600) -> Optional[int]:
    """Verify email verification token"""
    try:
        user_id = serializer.loads(token, salt='email-verification', max_age=max_age)
        return user_id
    except:
        return None

def create_email_verification(db: Session, user_id: int) -> str:
    """Create email verification record"""
    token = generate_verification_token(user_id)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    verification = EmailVerification(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.add(verification)
    db.commit()
    
    return token

def create_password_reset(db: Session, user_id: int) -> str:
    """Create password reset record"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    reset = PasswordReset(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset)
    db.commit()
    
    return token

def create_user(db: Session, email: str, first_name: str, last_name: str, password: str) -> User:
    hashed_password = get_password_hash(password)
    db_user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Add initial password to history
    add_password_to_history(db, db_user.id, hashed_password)
    
    return db_user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = get_user_by_id(db, user_id=user_id)
    if user is None:
        raise credentials_exception
    
    return user

def verify_refresh_token(db: Session, token: str) -> Optional[User]:
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.revoked == False,
        RefreshToken.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not db_token:
        return None
    
    return db_token.user

def revoke_refresh_token(db: Session, token: str) -> bool:
    db_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()
    if db_token:
        db_token.revoked = True
        db.commit()
        return True
    return False