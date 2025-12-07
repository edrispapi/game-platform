"""Business logic for the user service."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_password_hash, verify_password
from app.models import User, UserPreference, UserSession, UserStatus
from app.repository.preference_repository import UserPreferenceRepository
from app.repository.session_repository import UserSessionRepository
from app.repository.user_repository import UserRepository
from app.schemas import (
    PasswordChange,
    UserCreate,
    UserLogin,
    UserPreferenceCreate,
    UserPreferenceResponse,
    UserUpdate,
)
from app.utils.exceptions import ConflictError, NotFoundError


class UserService:
    """High-level operations orchestrating repositories and domain rules."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.sessions = UserSessionRepository(session)
        self.preferences = UserPreferenceRepository(session)

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------
    async def register(self, payload: UserCreate) -> User:
        """Create a new user ensuring username/email uniqueness."""
        if await self.users.get_by_username(payload.username):
            raise ConflictError("Username already registered")
        if await self.users.get_by_email(payload.email):
            raise ConflictError("Email already registered")

        hashed_password = get_password_hash(payload.password)
        
        # Assign a random game icon as avatar if not provided
        avatar_url = payload.avatar_url
        if not avatar_url:
            # Get a random game icon via HTTP call to game-catalog-service
            try:
                import httpx
                import os
                # Use internal service name in Docker, or localhost for local dev
                catalog_url = os.getenv("GAME_CATALOG_SERVICE_URL", "http://game-catalog-service:8012")
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.get(f"{catalog_url}/api/v1/catalog/game-icons?limit=1")
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("icons") and len(data["icons"]) > 0:
                            avatar_url = data["icons"][0]
            except Exception:
                # If HTTP call fails, leave avatar_url as None (will use default avatar)
                # In production, you might want to log this or use a fallback
                pass
        
        user = User(
            username=payload.username,
            email=payload.email,
            password_hash=hashed_password,
            full_name=payload.full_name,
            display_name=payload.display_name,
            bio=payload.bio,
            location=payload.location,
            website=payload.website,
            country_code=payload.country_code,
            language_code=payload.language_code,
            avatar_url=avatar_url,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def get_by_id(self, user_id: int) -> User:
        user = await self.users.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        return user

    async def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        return await self.users.list(skip=skip, limit=limit)

    async def get_recommended_users(
        self, current_user_id: int, limit: int = 20
    ) -> list[User]:
        """
        Get recommended users for friend discovery.
        Currently returns active users sorted by recent activity (last_login).
        In production, this could use ML recommendations, mutual friends, etc.
        """
        from sqlalchemy import select, func, desc, or_
        from app.models import User, UserStatus
        
        # Get active users or users with null status, excluding current user, ordered by recent activity
        stmt = (
            select(User)
            .where(User.id != current_user_id)
            .where(
                or_(
                    User.status == UserStatus.ACTIVE,
                    User.status.is_(None)
                )
            )
            .order_by(desc(User.last_login), desc(User.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_users(
        self, skip: int = 0, limit: int = 100, exclude_user_id: Optional[int] = None
    ) -> list[User]:
        """
        Get all users with pagination.
        Excludes a specific user if provided (e.g., current user).
        Includes all active users, or users with null status (for backward compatibility).
        """
        from sqlalchemy import select, desc, or_
        from app.models import User, UserStatus
        
        # Include ACTIVE users or users with null status (for seeded users that might not have status set)
        stmt = select(User).where(
            or_(
                User.status == UserStatus.ACTIVE,
                User.status.is_(None)
            )
        )
        if exclude_user_id:
            stmt = stmt.where(User.id != exclude_user_id)
        stmt = stmt.order_by(desc(User.created_at)).offset(skip).limit(limit)
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_user(self, user_id: int, payload: UserUpdate) -> User:
        user = await self.get_by_id(user_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(user, field, value)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def change_password(self, user_id: int, payload: PasswordChange) -> None:
        user = await self.get_by_id(user_id)
        if not verify_password(payload.current_password, user.password_hash):
            raise ConflictError("Current password is incorrect")
        user.password_hash = get_password_hash(payload.new_password)
        await self.session.commit()

    async def mark_email_verified(self, user_id: int) -> None:
        await self.users.mark_email_verified(user_id)
        await self.session.commit()

    async def deactivate_user(self, user_id: int) -> None:
        await self.users.mark_inactive(user_id)
        await self.session.commit()

    async def update_last_login(self, user_id: int) -> None:
        user = await self.get_by_id(user_id)
        user.last_login = datetime.now(timezone.utc)
        await self.session.commit()

    async def oauth_login_or_register(
        self,
        provider: str,
        provider_user_id: str,
        email: str,
        username: Optional[str] = None,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> User:
        """Login or register a user via OAuth provider.
        
        Checks if user exists by email or provider_user_id in extra_metadata.
        If exists, returns the user. If not, creates a new user.
        """
        # First, try to find by email
        user = await self.users.get_by_email(email)
        
        # If user exists, update their OAuth info in extra_metadata
        if user:
            if not user.extra_metadata:
                user.extra_metadata = {}
            user.extra_metadata[f"{provider}_id"] = provider_user_id
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            if full_name and not user.full_name:
                user.full_name = full_name
            user.email_verified = True  # OAuth emails are considered verified
            await self.session.commit()
            await self.session.refresh(user)
            return user
        
        # User doesn't exist, create new one
        # Generate username if not provided
        if not username:
            base_username = email.split("@")[0]
            username = base_username
            counter = 1
            while await self.users.get_by_username(username):
                username = f"{base_username}{counter}"
                counter += 1
        
        # Create user with OAuth info
        user = User(
            username=username,
            email=email,
            password_hash=get_password_hash(f"oauth_{provider}_{provider_user_id}"),  # Placeholder hash
            full_name=full_name,
            display_name=full_name or username,
            avatar_url=avatar_url,
            email_verified=True,  # OAuth emails are verified
            extra_metadata={
                f"{provider}_id": provider_user_id,
                "oauth_providers": [provider],
            },
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------
    async def authenticate(self, payload: UserLogin) -> User:
        user = await self.users.get_by_username_or_email(payload.username_or_email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise NotFoundError("Invalid credentials")
        if user.status != UserStatus.ACTIVE:
            raise ConflictError("Account is not active")
        return user

    # ------------------------------------------------------------------
    # Sessions
    # ------------------------------------------------------------------
    async def create_session(
        self,
        user_id: int,
        token: str,
        remember_me: bool,
        device_info: dict | None,
        ip_address: str | None,
        user_agent: str | None,
    ) -> Optional[UserSession]:
        if not remember_me:
            return None
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        session = await self.sessions.create(
            user_id=user_id,
            session_token=token,
            expires_at=expires_at,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.session.commit()
        return session

    async def list_active_sessions(self, user_id: int) -> list[UserSession]:
        return await self.sessions.list_active_for_user(user_id)

    async def revoke_all_sessions(self, user_id: int) -> None:
        await self.sessions.deactivate_all_for_user(user_id)
        await self.session.commit()

    # ------------------------------------------------------------------
    # Preferences
    # ------------------------------------------------------------------
    async def list_preferences(self, user_id: int) -> list[UserPreference]:
        return await self.preferences.list_for_user(user_id)

    async def create_preference(
        self, user_id: int, payload: UserPreferenceCreate
    ) -> UserPreference:
        pref = await self.preferences.create(
            user_id=user_id,
            key=payload.preference_key,
            value=payload.preference_value,
        )
        await self.session.commit()
        return pref

    async def update_preference(
        self, user_id: int, key: str, value: str
    ) -> UserPreference:
        pref = await self.preferences.get_for_user(user_id, key)
        if not pref:
            raise NotFoundError("Preference not found")
        pref.preference_value = value
        await self.session.commit()
        await self.session.refresh(pref)
        return pref


