"""
User Service CRUD Operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from . import models, schemas
from .core.auth import get_password_hash, verify_password
import uuid
from datetime import datetime, timedelta, timezone

class UserCRUD:
    def __init__(self, db: Session):
        self.db = db
    
    def create_user(self, user: schemas.UserCreate) -> models.User:
        """Create a new user"""
        hashed_password = get_password_hash(user.password)
        db_user = models.User(
            username=user.username,
            email=user.email,
            password_hash=hashed_password,
            full_name=user.full_name,
            display_name=user.display_name,
            bio=user.bio,
            location=user.location,
            website=user.website,
            country_code=user.country_code,
            language_code=user.language_code,
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    def get_user_by_id(self, user_id: int) -> Optional[models.User]:
        """Get user by ID"""
        return self.db.query(models.User).filter(models.User.id == user_id).first()
    
    def get_user_by_uuid(self, user_uuid: str) -> Optional[models.User]:
        """Get user by UUID"""
        return self.db.query(models.User).filter(models.User.uuid == user_uuid).first()
    
    def get_user_by_username(self, username: str) -> Optional[models.User]:
        """Get user by username"""
        return self.db.query(models.User).filter(models.User.username == username).first()
    
    def get_user_by_email(self, email: str) -> Optional[models.User]:
        """Get user by email"""
        return self.db.query(models.User).filter(models.User.email == email).first()
    
    def get_user_by_username_or_email(self, username_or_email: str) -> Optional[models.User]:
        """Get user by username or email"""
        return self.db.query(models.User).filter(
            or_(models.User.username == username_or_email, models.User.email == username_or_email)
        ).first()
    
    def update_user(self, user_id: int, user_update: schemas.UserUpdate) -> Optional[models.User]:
        """Update user information"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            return None
        
        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)
        
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    def verify_password(self, user: models.User, password: str) -> bool:
        """Verify user password"""
        return verify_password(password, user.password_hash)
    
    def change_password(self, user_id: int, new_password: str) -> bool:
        """Change user password"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            return False
        
        db_user.password_hash = get_password_hash(new_password)
        self.db.commit()
        return True
    
    def update_last_login(self, user_id: int) -> bool:
        """Update user's last login time"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            return False
        
        db_user.last_login = datetime.now(timezone.utc)
        self.db.commit()
        return True
    
    def verify_email(self, user_id: int) -> bool:
        """Mark user's email as verified"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            return False
        
        db_user.email_verified = True
        self.db.commit()
        return True
    
    def deactivate_user(self, user_id: int) -> bool:
        """Deactivate user account"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            return False
        
        db_user.status = models.UserStatus.INACTIVE
        self.db.commit()
        return True
    
    def get_users(self, skip: int = 0, limit: int = 100) -> List[models.User]:
        """Get list of users with pagination"""
        return self.db.query(models.User).offset(skip).limit(limit).all()

class UserSessionCRUD:
    def __init__(self, db: Session):
        self.db = db
    
    def create_session(self, user_id: int, session_token: str, device_info: dict = None, 
                      ip_address: str = None, user_agent: str = None) -> models.UserSession:
        """Create a new user session"""
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)  # 30 days session
        
        db_session = models.UserSession(
            user_id=user_id,
            session_token=session_token,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at
        )
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        return db_session
    
    def get_session_by_token(self, session_token: str) -> Optional[models.UserSession]:
        """Get session by token"""
        return self.db.query(models.UserSession).filter(
            and_(
                models.UserSession.session_token == session_token,
                models.UserSession.is_active == True,
                models.UserSession.expires_at > datetime.now(timezone.utc)
            )
        ).first()
    
    def deactivate_session(self, session_token: str) -> bool:
        """Deactivate a session"""
        db_session = self.get_session_by_token(session_token)
        if not db_session:
            return False
        
        db_session.is_active = False
        self.db.commit()
        return True
    
    def deactivate_all_user_sessions(self, user_id: int) -> bool:
        """Deactivate all sessions for a user"""
        self.db.query(models.UserSession).filter(
            and_(
                models.UserSession.user_id == user_id,
                models.UserSession.is_active == True
            )
        ).update({"is_active": False})
        self.db.commit()
        return True

class UserPreferenceCRUD:
    def __init__(self, db: Session):
        self.db = db
    
    def create_preference(self, user_id: int, preference: schemas.UserPreferenceCreate) -> models.UserPreference:
        """Create a user preference"""
        db_preference = models.UserPreference(
            user_id=user_id,
            preference_key=preference.preference_key,
            preference_value=preference.preference_value
        )
        self.db.add(db_preference)
        self.db.commit()
        self.db.refresh(db_preference)
        return db_preference
    
    def get_user_preferences(self, user_id: int) -> List[models.UserPreference]:
        """Get all preferences for a user"""
        return self.db.query(models.UserPreference).filter(models.UserPreference.user_id == user_id).all()
    
    def get_preference(self, user_id: int, preference_key: str) -> Optional[models.UserPreference]:
        """Get a specific preference for a user"""
        return self.db.query(models.UserPreference).filter(
            and_(
                models.UserPreference.user_id == user_id,
                models.UserPreference.preference_key == preference_key
            )
        ).first()
    
    def update_preference(self, user_id: int, preference_key: str, preference_value: str) -> Optional[models.UserPreference]:
        """Update a user preference"""
        db_preference = self.get_preference(user_id, preference_key)
        if not db_preference:
            return None
        
        db_preference.preference_value = preference_value
        self.db.commit()
        self.db.refresh(db_preference)
        return db_preference

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Convenience wrapper to create a user using a transient session."""

    return UserCRUD(db).create_user(user)


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    """Retrieve a user by username using the shared CRUD helper."""

    return UserCRUD(db).get_user_by_username(username)


def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    """Authenticate a user by username (or email) and password."""

    user_crud = UserCRUD(db)
    user = user_crud.get_user_by_username_or_email(username)
    if not user:
        return None
    if not user_crud.verify_password(user, password):
        return None
    return user
