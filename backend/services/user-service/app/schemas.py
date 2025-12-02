"""
User Service Pydantic Schemas
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from uuid import UUID

class UserStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"
    BANNED = "banned"

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=100)
    display_name: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = None
    location: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = Field(None, max_length=255)
    country_code: Optional[str] = Field(None, max_length=2)
    language_code: str = Field(default="en", max_length=5)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    display_name: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = None
    location: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = Field(None, max_length=255)
    country_code: Optional[str] = Field(None, max_length=2)
    language_code: Optional[str] = Field(None, max_length=5)

class UserResponse(UserBase):
    id: int
    uuid: UUID
    status: UserStatusEnum
    email_verified: bool
    two_factor_enabled: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    steam_level: int
    steam_xp: int
    profile_visibility: str
    show_online_status: bool
    show_game_activity: bool
    extra_metadata: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    username_or_email: str
    password: str
    remember_me: bool = False

class UserLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

class EmailVerification(BaseModel):
    email: EmailStr

class EmailVerificationConfirm(BaseModel):
    token: str

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

class UserPreferenceCreate(BaseModel):
    preference_key: str = Field(..., max_length=100)
    preference_value: str

class UserPreferenceResponse(BaseModel):
    id: int
    user_id: int
    preference_key: str
    preference_value: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserSessionResponse(BaseModel):
    id: int
    user_id: int
    device_info: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    is_active: bool
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
