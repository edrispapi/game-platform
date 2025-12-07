"""User Service API Routes."""
from __future__ import annotations

import os
import httpx
import logging
from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.core.auth import create_access_token, verify_token
from app.core.config import settings
from app.db.session import get_session
from app.models import User
from app.models import User
from app.schemas import (
    OAuthLogin,
    PasswordChange,
    TwoFactorRequest,
    TwoFactorResponse,
    UserCreate,
    UserLogin,
    UserLoginResponse,
    UserPreferenceCreate,
    UserPreferenceResponse,
    UserProfileResponse,
    UserResponse,
    UserSessionResponse,
    UserUpdate,
)
from app.services.user_service import UserService
from app.utils.exceptions import ConflictError, NotFoundError, ServiceError

logger = logging.getLogger(__name__)

router = APIRouter()

# Token expires in 1 day (1440 minutes) by default
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))


async def get_user_service(
    session: AsyncSession = Depends(get_session),
) -> UserService:
    return UserService(session)


async def get_current_user(
    token: dict = Depends(verify_token),
    service: UserService = Depends(get_user_service),
) -> User:
    try:
        return await service.get_by_id(token.get("user_id"))
    except ServiceError as exc:  # pragma: no cover
        raise _http_error_from_service(exc)


def _http_error_from_service(exc: ServiceError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, ConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register_user(
    payload: UserCreate, service: UserService = Depends(get_user_service)
) -> User:
    try:
        return await service.register(payload)
    except ServiceError as exc:
        raise _http_error_from_service(exc)


@router.post("/login")
async def login_user(
    login_data: UserLogin,
    request: Request,
    service: UserService = Depends(get_user_service),
) -> dict:
    try:
        user = await service.authenticate(login_data)
        user_id = user.id
        user_username = user.username  # Get username before update
        
        # Update last login using raw SQL to avoid ORM issues
        session = service.session
        await session.execute(
            text("UPDATE users SET last_login = NOW() WHERE id = :user_id"),
            {"user_id": user_id}
        )
        await session.commit()
        
        # Use raw SQL query to fetch all user data as dictionary, avoiding ORM lazy-loading
        result = await session.execute(
            text("""
                SELECT id, uuid, username, email, full_name, display_name, bio, location, website,
                       country_code, language_code, status, email_verified, two_factor_enabled,
                       last_login, created_at, updated_at, steam_level, steam_xp,
                       profile_visibility, show_online_status, show_game_activity, extra_metadata
                FROM users WHERE id = :user_id
            """),
            {"user_id": user_id}
        )
        row = result.mappings().first()
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Extract all values from the row dictionary
        user_id = row["id"]
        user_uuid = str(row["uuid"])
        user_username = row["username"]
        user_email = row["email"]
        user_full_name = row["full_name"]
        user_display_name = row["display_name"]
        user_bio = row["bio"]
        user_location = row["location"]
        user_website = row["website"]
        user_country_code = row["country_code"]
        user_language_code = row["language_code"]
        user_status = str(row["status"]).lower()  # Convert to lowercase for Pydantic enum
        user_email_verified = row["email_verified"]
        user_two_factor_enabled = row["two_factor_enabled"]
        user_last_login = row["last_login"].isoformat() if row["last_login"] else None
        user_created_at = row["created_at"].isoformat() if row["created_at"] else None
        user_updated_at = row["updated_at"].isoformat() if row["updated_at"] else None
        user_steam_level = row["steam_level"]
        user_steam_xp = row["steam_xp"]
        user_profile_visibility = row["profile_visibility"]
        user_show_online_status = row["show_online_status"]
        user_show_game_activity = row["show_game_activity"]
        user_extra_metadata = row["extra_metadata"]
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        # Include standard "sub" claim for cross-service compatibility (e.g. friends-chat-service)
        access_token = create_access_token(
            data={"user_id": user_id, "username": user_username, "sub": str(user_id)},
            expires_delta=access_token_expires,
        )
        client = request.client
        device_info = {
            "user_agent": request.headers.get("user-agent"),
            "ip_address": client.host if client else None,
        }
        await service.create_session(
            user_id=user_id,
            token=access_token,
            remember_me=login_data.remember_me,
            device_info=device_info,
            ip_address=device_info["ip_address"],
            user_agent=device_info["user_agent"],
        )
        # Build user payload using pre-extracted values
        user_dict = {
            "id": user_id,
            "uuid": user_uuid,
            "username": user_username,
            "email": user_email,
            "full_name": user_full_name,
            "display_name": user_display_name,
            "bio": user_bio,
            "location": user_location,
            "website": user_website,
            "country_code": user_country_code,
            "language_code": user_language_code,
            "status": user_status,
            "email_verified": user_email_verified,
            "two_factor_enabled": user_two_factor_enabled,
            "last_login": user_last_login,
            "created_at": user_created_at,
            "updated_at": user_updated_at,
            "steam_level": user_steam_level,
            "steam_xp": user_steam_xp,
            "profile_visibility": user_profile_visibility,
            "show_online_status": user_show_online_status,
            "show_game_activity": user_show_game_activity,
            "extra_metadata": user_extra_metadata,
        }
        user_payload = UserResponse.model_validate(user_dict)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user_payload.model_dump(),
        }
    except ServiceError as exc:
        raise _http_error_from_service(exc)


@router.post("/oauth/login")
async def oauth_login(
    oauth_data: OAuthLogin,
    request: Request,
    service: UserService = Depends(get_user_service),
) -> dict:
    """OAuth login/register endpoint for Google, Discord, and Steam."""
    try:
        # Validate provider
        if oauth_data.provider not in ["google", "discord", "steam"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OAuth provider. Must be 'google', 'discord', or 'steam'"
            )
        
        # Login or register user via OAuth
        user = await service.oauth_login_or_register(
            provider=oauth_data.provider,
            provider_user_id=oauth_data.provider_user_id,
            email=oauth_data.email,
            username=oauth_data.username,
            full_name=oauth_data.full_name,
            avatar_url=oauth_data.avatar_url,
        )
        
        # Update last login
        user_id = user.id
        await service.update_last_login(user_id)
        
        # Use raw SQL query to fetch all user data as dictionary, avoiding ORM lazy-loading
        session = service.session
        result = await session.execute(
            text("""
                SELECT id, uuid, username, email, full_name, display_name, bio, location, website,
                       country_code, language_code, status, email_verified, two_factor_enabled,
                       last_login, created_at, updated_at, steam_level, steam_xp,
                       profile_visibility, show_online_status, show_game_activity, extra_metadata
                FROM users WHERE id = :user_id
            """),
            {"user_id": user_id}
        )
        row = result.mappings().first()
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Extract all values from the row dictionary
        user_id = row["id"]
        user_uuid = str(row["uuid"])
        user_username = row["username"]
        user_email = row["email"]
        user_full_name = row["full_name"]
        user_display_name = row["display_name"]
        user_bio = row["bio"]
        user_location = row["location"]
        user_website = row["website"]
        user_country_code = row["country_code"]
        user_language_code = row["language_code"]
        user_status = str(row["status"]).lower()  # Convert to lowercase for Pydantic enum
        user_email_verified = row["email_verified"]
        user_two_factor_enabled = row["two_factor_enabled"]
        user_last_login = row["last_login"].isoformat() if row["last_login"] else None
        user_created_at = row["created_at"].isoformat() if row["created_at"] else None
        user_updated_at = row["updated_at"].isoformat() if row["updated_at"] else None
        user_steam_level = row["steam_level"]
        user_steam_xp = row["steam_xp"]
        user_profile_visibility = row["profile_visibility"]
        user_show_online_status = row["show_online_status"]
        user_show_game_activity = row["show_game_activity"]
        user_extra_metadata = row["extra_metadata"]
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        # Include standard "sub" claim for cross-service compatibility (e.g. friends-chat-service)
        access_token = create_access_token(
            data={"user_id": user_id, "username": user_username, "sub": str(user_id)},
            expires_delta=access_token_expires,
        )
        
        # Create session
        client = request.client
        device_info = {
            "user_agent": request.headers.get("user-agent"),
            "ip_address": client.host if client else None,
        }
        await service.create_session(
            user_id=user_id,
            token=access_token,
            remember_me=oauth_data.remember_me,
            device_info=device_info,
            ip_address=device_info["ip_address"],
            user_agent=device_info["user_agent"],
        )
        
        # Build user payload using pre-extracted values
        user_dict = {
            "id": user_id,
            "uuid": user_uuid,
            "username": user_username,
            "email": user_email,
            "full_name": user_full_name,
            "display_name": user_display_name,
            "bio": user_bio,
            "location": user_location,
            "website": user_website,
            "country_code": user_country_code,
            "language_code": user_language_code,
            "status": user_status,
            "email_verified": user_email_verified,
            "two_factor_enabled": user_two_factor_enabled,
            "last_login": user_last_login,
            "created_at": user_created_at,
            "updated_at": user_updated_at,
            "steam_level": user_steam_level,
            "steam_xp": user_steam_xp,
            "profile_visibility": user_profile_visibility,
            "show_online_status": user_show_online_status,
            "show_game_activity": user_show_game_activity,
            "extra_metadata": user_extra_metadata,
        }
        user_payload = UserResponse.model_validate(user_dict)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user_payload.model_dump(),
        }
    except ServiceError as exc:
        raise _http_error_from_service(exc)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> User:
    try:
        return await service.update_user(current_user.id, user_update)
    except ServiceError as exc:
        raise _http_error_from_service(exc)


@router.post("/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> dict[str, str]:
    try:
        await service.change_password(current_user.id, password_change)
        return {"message": "Password changed successfully"}
    except ServiceError as exc:
        raise _http_error_from_service(exc)


@router.post("/two-factor", response_model=TwoFactorResponse)
async def toggle_two_factor(
    request_data: TwoFactorRequest,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> TwoFactorResponse:
    """Enable or disable two-factor authentication.
    
    When enabling, returns QR code and secret for authenticator setup.
    """
    try:
        if request_data.enabled:
            # Generate QR code and secret for 2FA setup
            import secrets
            import base64
            
            # Generate a random secret (32 characters base32)
            secret = base64.b32encode(secrets.token_bytes(20)).decode('utf-8')
            
            # Create TOTP URI for QR code
            totp_uri = f"otpauth://totp/CrimsonGrid:{current_user.email}?secret={secret}&issuer=CrimsonGrid"
            
            # Generate QR code using external service
            qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={totp_uri}"
            
            # Store secret in user's extra_metadata and update 2FA status
            extra_metadata = current_user.extra_metadata or {}
            extra_metadata['2fa_secret'] = secret
            
            # Update user with 2FA enabled and secret
            await service.update_user(
                current_user.id,
                UserUpdate(
                    two_factor_enabled=True,
                    extra_metadata=extra_metadata
                )
            )
            
            return TwoFactorResponse(
                enabled=True,
                qr_code=qr_code_url,
                secret=secret,
                message="2FA enabled successfully. Scan the QR code with your authenticator app."
            )
        else:
            # Clear secret when disabling
            extra_metadata = current_user.extra_metadata or {}
            extra_metadata.pop('2fa_secret', None)
            
            # Update user with 2FA disabled
            await service.update_user(
                current_user.id,
                UserUpdate(
                    two_factor_enabled=False,
                    extra_metadata=extra_metadata
                )
            )
            
            return TwoFactorResponse(
                enabled=False,
                message="2FA disabled successfully."
            )
    except ServiceError as exc:
        raise _http_error_from_service(exc)


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    service: UserService = Depends(get_user_service),
) -> List[User]:
    return await service.list_users(skip=skip, limit=limit)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int, service: UserService = Depends(get_user_service)
) -> User:
    try:
        return await service.get_by_id(user_id)
    except ServiceError as exc:
        raise _http_error_from_service(exc)


@router.get("/users/recommended", response_model=List[UserProfileResponse])
@router.get("/recommended", response_model=List[UserProfileResponse])
async def get_recommended_users(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> List[UserProfileResponse]:
    """
    Get recommended users for friend discovery.
    Returns active users sorted by recent activity.
    Fetches real-time data from friends-chat-service and online-service.
    """
    users = await service.get_recommended_users(
        current_user_id=current_user.id, limit=limit
    )
    
    # Create a service token for inter-service communication
    service_token = create_access_token(
        data={"user_id": current_user.id, "username": current_user.username, "sub": str(current_user.id)},
        expires_delta=timedelta(minutes=5),
    )
    
    # Convert to UserProfileResponse with real stats from other services
    profiles: List[UserProfileResponse] = []
    for user in users:
        friends_count = 0
        hours_played = 0
        achievements_count = 0
        game_slug = None
        
        # Fetch friends count from friends-chat-service
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                friends_res = await client.get(
                    f"{settings.FRIENDS_CHAT_SERVICE_URL}/api/v1/friends/count/{user.uuid}",
                    headers={"Authorization": f"Bearer {service_token}"}
                )
                if friends_res.status_code == 200:
                    friends_count = friends_res.json().get("friends_count", 0)
        except Exception as e:
            logger.warning(f"Could not fetch friends count for user {user.uuid}: {e}")
        
        # Fetch online status and game activity from online-service
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                online_res = await client.get(
                    f"{settings.ONLINE_SERVICE_URL}/api/v1/online/status/{user.uuid}",
                    headers={"Authorization": f"Bearer {service_token}"}
                )
                if online_res.status_code == 200:
                    online_data = online_res.json()
                    status_str = online_data.get("status", "Offline")
                    game_slug = online_data.get("game_slug")
                    hours_played = online_data.get("hours_played", 0)
        except Exception as e:
            logger.warning(f"Could not fetch online status for user {user.uuid}: {e}")
        
        # Fetch achievements count from achievement-service
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                ach_res = await client.get(
                    f"{settings.ACHIEVEMENT_SERVICE_URL}/api/v1/achievements/users/{user.uuid}",
                    headers={"Authorization": f"Bearer {service_token}"}
                )
                if ach_res.status_code == 200:
                    ach_data = ach_res.json()
                    if isinstance(ach_data, list):
                        achievements_count = len(ach_data)
                    elif isinstance(ach_data, dict) and "items" in ach_data and isinstance(ach_data["items"], list):
                        achievements_count = len(ach_data["items"])
        except Exception as e:
            logger.warning(f"Could not fetch achievements for user {user.uuid}: {e}")

        # Convert UserStatus enum to string for Pydantic
        if hasattr(user.status, 'value'):
            user_status = user.status.value.lower()
        elif isinstance(user.status, str):
            user_status = user.status.lower()
        else:
            user_status = str(user.status).split('.')[-1].lower() if '.' in str(user.status) else 'active'
        
        profile_dict = {
            "id": user.id,
            "uuid": user.uuid,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "display_name": user.display_name,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "status": user_status,
            "hours_played": hours_played,
            "friends_count": friends_count,
            "achievements_count": achievements_count,
            "current_game_slug": game_slug,
            "created_at": user.created_at,
            "last_login": user.last_login,
        }
        profiles.append(UserProfileResponse.model_validate(profile_dict))
    
    return profiles


@router.get("/all", response_model=List[UserProfileResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> List[UserProfileResponse]:
    """
    Get all users with pagination, excluding current user.
    Fetches real-time data from friends-chat-service and online-service.
    """
    users = await service.get_all_users(
        skip=skip, limit=limit, exclude_user_id=current_user.id
    )
    
    # Create a service token for inter-service communication
    service_token = create_access_token(
        data={"user_id": current_user.id, "username": current_user.username, "sub": str(current_user.id)},
        expires_delta=timedelta(minutes=5),
    )
    
    # Convert to UserProfileResponse with real stats from other services
    profiles: List[UserProfileResponse] = []
    for user in users:
        friends_count = 0
        hours_played = 0
        achievements_count = 0
        game_slug = None
        
        # Fetch friends count from friends-chat-service
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                friends_res = await client.get(
                    f"{settings.FRIENDS_CHAT_SERVICE_URL}/api/v1/friends/count/{user.uuid}",
                    headers={"Authorization": f"Bearer {service_token}"}
                )
                if friends_res.status_code == 200:
                    friends_count = friends_res.json().get("friends_count", 0)
        except Exception as e:
            logger.warning(f"Could not fetch friends count for user {user.uuid}: {e}")
        
        # Fetch online status and game activity from online-service
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                online_res = await client.get(
                    f"{settings.ONLINE_SERVICE_URL}/api/v1/online/status/{user.uuid}",
                    headers={"Authorization": f"Bearer {service_token}"}
                )
                if online_res.status_code == 200:
                    online_data = online_res.json()
                    status_str = online_data.get("status", "Offline")
                    game_slug = online_data.get("game_slug")
                    hours_played = online_data.get("hours_played", 0)
        except Exception as e:
            logger.warning(f"Could not fetch online status for user {user.uuid}: {e}")
        
        # Fetch achievements count from achievement-service
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                ach_res = await client.get(
                    f"{settings.ACHIEVEMENT_SERVICE_URL}/api/v1/achievements/users/{user.uuid}",
                    headers={"Authorization": f"Bearer {service_token}"}
                )
                if ach_res.status_code == 200:
                    ach_data = ach_res.json()
                    if isinstance(ach_data, list):
                        achievements_count = len(ach_data)
                    elif isinstance(ach_data, dict) and "items" in ach_data and isinstance(ach_data["items"], list):
                        achievements_count = len(ach_data["items"])
        except Exception as e:
            logger.warning(f"Could not fetch achievements for user {user.uuid}: {e}")

        # Convert UserStatus enum to string for Pydantic
        if hasattr(user.status, 'value'):
            user_status = user.status.value.lower()
        elif isinstance(user.status, str):
            user_status = user.status.lower()
        else:
            user_status = str(user.status).split('.')[-1].lower() if '.' in str(user.status) else 'active'
        
        profile_dict = {
            "id": user.id,
            "uuid": user.uuid,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "display_name": user.display_name,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "status": user_status,
            "hours_played": hours_played,
            "friends_count": friends_count,
            "achievements_count": achievements_count,
            "current_game_slug": game_slug,
            "created_at": user.created_at,
            "last_login": user.last_login,
        }
        profiles.append(UserProfileResponse.model_validate(profile_dict))
    
    return profiles


@router.post("/logout")
async def logout_user(
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> dict[str, str]:
    await service.revoke_all_sessions(current_user.id)
    return {"message": "Logged out successfully"}


@router.get("/preferences", response_model=List[UserPreferenceResponse])
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> List[UserPreferenceResponse]:
    prefs = await service.list_preferences(current_user.id)
    return prefs


@router.post("/preferences", response_model=UserPreferenceResponse)
async def create_user_preference(
    preference: UserPreferenceCreate,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> UserPreferenceResponse:
    try:
        return await service.create_preference(current_user.id, preference)
    except ServiceError as exc:
        raise _http_error_from_service(exc)


@router.put("/preferences/{preference_key}", response_model=UserPreferenceResponse)
async def update_user_preference(
    preference_key: str,
    preference_value: str,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> UserPreferenceResponse:
    try:
        return await service.update_preference(
            current_user.id, preference_key, preference_value
        )
    except ServiceError as exc:
        raise _http_error_from_service(exc)


@router.get("/sessions", response_model=List[UserSessionResponse])
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> List[UserSessionResponse]:
    return await service.list_active_sessions(current_user.id)