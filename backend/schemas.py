from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional, List, Annotated, Dict, Any
from datetime import datetime
from enum import Enum
import re

class UserBase(BaseModel):
    email: EmailStr
    first_name: Annotated[str, Field(min_length=1, max_length=50, pattern=r'^[a-zA-Z\s\-\']+$')]
    last_name: Annotated[str, Field(min_length=1, max_length=50, pattern=r'^[a-zA-Z\s\-\']+$')]

class UserCreate(UserBase):
    password: Annotated[str, Field(min_length=8, max_length=128)]
    confirm_password: str
    terms_accepted: bool = Field(..., description="Must accept terms and conditions")
    
    
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')
        
        strength_checks = [
            (r'[A-Z]', 'at least one uppercase letter'),
            (r'[a-z]', 'at least one lowercase letter'),
            (r'[0-9]', 'at least one number'),
            (r'[!@#$%^&*(),.?":{}|<>]', 'at least one special character')
        ]
        
        for pattern, message in strength_checks:
            if not re.search(pattern, v):
                raise ValueError(f'Password must contain {message}')
        
        # Check for common weak patterns - but be more reasonable
        if re.search(r'(.)\1{3,}', v):  # More than 3 repeated characters
            raise ValueError('Password cannot contain too many repeated characters')
        
        # Check for very common weak passwords (exact matches or very obvious patterns)
        weak_patterns = ['123456789', 'abcdefgh', 'qwertyuiop']
        very_weak_passwords = ['password', 'password123', 'admin', 'admin123', 'letmein', '12345678']
        
        lower_password = v.lower()
        if any(pattern in lower_password for pattern in weak_patterns) or lower_password in very_weak_passwords:
            raise ValueError('Password is too common or contains obvious sequences')
            
        return v
    
    @field_validator('confirm_password')
    def passwords_match(cls, v, info):
        password = info.data.get('password')
        if password is not None and v != password:
            raise ValueError('Passwords do not match')
        return v
    
    @field_validator('terms_accepted')
    def terms_must_be_accepted(cls, v):
        if not v:
            raise ValueError('You must accept the terms and conditions')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    mfa_code: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    mfa_enabled: bool
    last_login_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: Optional[int] = 900  # 15 minutes

class TokenRefresh(BaseModel):
    refresh_token: Annotated[str, Field(min_length=1)]

class Message(BaseModel):
    message: str

class PasswordStrength(BaseModel):
    score: int = Field(..., ge=0, le=5)
    feedback: List[str]

class EmailData(BaseModel):
    email: EmailStr

class PasswordResetRequest(BaseModel):
    token: str
    new_password: Annotated[str, Field(min_length=12, max_length=128)]
    
    @field_validator('new_password')
    def validate_password(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')
        
        strength_checks = [
            (r'[A-Z]', 'at least one uppercase letter'),
            (r'[a-z]', 'at least one lowercase letter'),
            (r'[0-9]', 'at least one number'),
            (r'[!@#$%^&*(),.?":{}|<>]', 'at least one special character')
        ]
        
        for pattern, message in strength_checks:
            if not re.search(pattern, v):
                raise ValueError(f'Password must contain {message}')
        
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: Annotated[str, Field(min_length=12, max_length=128)]
    confirm_password: str
    
    @field_validator('new_password')
    def validate_password(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')
        
        strength_checks = [
            (r'[A-Z]', 'at least one uppercase letter'),
            (r'[a-z]', 'at least one lowercase letter'),
            (r'[0-9]', 'at least one number'),
            (r'[!@#$%^&*(),.?":{}|<>]', 'at least one special character')
        ]
        
        for pattern, message in strength_checks:
            if not re.search(pattern, v):
                raise ValueError(f'Password must contain {message}')
        
        return v
    
    @field_validator('confirm_password')
    def passwords_match(cls, v, info):
        new_password = info.data.get('new_password')
        if new_password is not None and v != new_password:
            raise ValueError('Passwords do not match')
        return v

class AIModeEnum(str, Enum):
    SIMILAR_QUESTIONS = "similar_questions"
    IMAGE_PROCESSING = "image_processing"

class MessageRoleEnum(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ChatCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    mode: AIModeEnum

class ChatUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    message_metadata: Optional[Dict[str, Any]] = None

class MessageResponse(BaseModel):
    id: int
    chat_id: int
    role: MessageRoleEnum
    content: str
    message_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    id: int
    user_id: int
    title: str
    mode: AIModeEnum
    is_pinned: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = None
    last_message: Optional[MessageResponse] = None
    
    class Config:
        from_attributes = True

class ChatDetailResponse(ChatResponse):
    messages: List[MessageResponse] = []

class ChatSettingsCreate(BaseModel):
    mode: AIModeEnum
    settings: Dict[str, Any]

class ChatSettingsUpdate(BaseModel):
    settings: Dict[str, Any]

class ChatSettingsResponse(BaseModel):
    id: int
    user_id: int
    mode: AIModeEnum
    settings: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True