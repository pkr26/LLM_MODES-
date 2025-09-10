from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserResponse, Token, TokenRefresh, Message, EmailData, PasswordResetRequest, ChangePasswordRequest
from auth import (
    authenticate_user, create_user, get_user_by_email,
    create_access_token, create_refresh_token, verify_refresh_token,
    revoke_refresh_token, get_current_user, is_account_locked,
    increment_failed_login, reset_failed_login_attempts,
    create_email_verification, create_password_reset, check_password_history,
    add_password_to_history, get_password_hash, verify_password
)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    if get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Create new user
    try:
        db_user = create_user(db, user.email, user.first_name, user.last_name, user.password)
        
        # Create email verification token
        verification_token = create_email_verification(db, db_user.id)
        
        # TODO: Send verification email
        logging.info(f"User {db_user.email} registered. Verification token: {verification_token}")
        
        return db_user
    except Exception as e:
        logging.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    # Get user by email first
    db_user = get_user_by_email(db, user.email)
    
    # Check if account is locked
    if db_user and is_account_locked(db_user):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is temporarily locked due to multiple failed login attempts"
        )
    
    # Authenticate user
    authenticated_user = authenticate_user(db, user.email, user.password)
    
    if not authenticated_user:
        # Increment failed login attempts if user exists
        if db_user:
            increment_failed_login(db, db_user)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not authenticated_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled"
        )
    
    # Reset failed login attempts on successful login
    reset_failed_login_attempts(db, authenticated_user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(authenticated_user.id)})
    refresh_token = create_refresh_token(authenticated_user.id, db, request)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
@limiter.limit("20/minute")
async def refresh_token(request: Request, token_data: TokenRefresh, db: Session = Depends(get_db)):
    # Verify refresh token
    user = verify_refresh_token(db, token_data.refresh_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled"
        )
    
    # Create new access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Create new refresh token for better security (token rotation)
    new_refresh_token = create_refresh_token(user.id, db, request)
    
    # Revoke old refresh token
    revoke_refresh_token(db, token_data.refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout", response_model=Message)
async def logout(token_data: TokenRefresh, db: Session = Depends(get_db)):
    # Revoke refresh token
    success = revoke_refresh_token(db, token_data.refresh_token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid refresh token"
        )
    
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password", response_model=Message)
@limiter.limit("3/minute")
async def forgot_password(request: Request, email_data: EmailData, db: Session = Depends(get_db)):
    email = email_data.email
    
    user = get_user_by_email(db, email)
    if user:
        reset_token = create_password_reset(db, user.id)
        # TODO: Send password reset email
        logging.info(f"Password reset requested for {email}. Token: {reset_token}")
    
    # Always return success to prevent email enumeration
    return {"message": "If your email is registered, you will receive a password reset link"}

@router.post("/reset-password", response_model=Message)
@limiter.limit("5/minute")
async def reset_password(request: Request, reset_data: PasswordResetRequest, db: Session = Depends(get_db)):
    token = reset_data.token
    new_password = reset_data.new_password
    
    # Find valid reset token
    from models import PasswordReset
    from datetime import datetime, timezone
    
    reset_record = db.query(PasswordReset).filter(
        PasswordReset.token == token,
        PasswordReset.used == False,
        PasswordReset.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    user = reset_record.user
    
    # Check password history
    if not check_password_history(db, user.id, new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reuse recent passwords"
        )
    
    # Update password
    hashed_password = get_password_hash(new_password)
    user.hashed_password = hashed_password
    user.password_changed_at = datetime.now(timezone.utc)
    
    # Add to password history
    add_password_to_history(db, user.id, hashed_password)
    
    # Mark reset token as used
    reset_record.used = True
    db.commit()
    
    return {"message": "Password reset successfully"}

@router.post("/verify-email", response_model=Message)
async def verify_email(token: str, db: Session = Depends(get_db)):
    from models import EmailVerification
    from datetime import datetime, timezone
    
    verification = db.query(EmailVerification).filter(
        EmailVerification.token == token,
        EmailVerification.used == False,
        EmailVerification.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    user = verification.user
    user.is_verified = True
    verification.used = True
    db.commit()
    
    return {"message": "Email verified successfully"}

@router.post("/change-password", response_model=Message)
@limiter.limit("5/minute")
async def change_password(
    request: Request, 
    change_data: ChangePasswordRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not verify_password(change_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Check password history
    if not check_password_history(db, current_user.id, change_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reuse recent passwords"
        )
    
    # Check if new password is same as current
    if verify_password(change_data.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as current password"
        )
    
    # Update password
    from datetime import datetime, timezone
    hashed_password = get_password_hash(change_data.new_password)
    current_user.hashed_password = hashed_password
    current_user.password_changed_at = datetime.now(timezone.utc)
    
    # Add to password history
    add_password_to_history(db, current_user.id, hashed_password)
    
    db.commit()
    
    return {"message": "Password changed successfully"}

# Exception handlers are added to the main app, not router