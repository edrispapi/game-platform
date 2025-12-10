"\"\"\"User data access helpers.\"\"\""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserStatus


class UserRepository:
    """Encapsulates persistence logic for `User` entities."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def count(self) -> int:
        result = await self.session.execute(select(func.count(User.id)))
        return result.scalar_one()

    async def list(self, skip: int = 0, limit: int = 100) -> list[User]:
        result = await self.session.execute(
            select(User).offset(skip).limit(limit).order_by(User.id)
        )
        return list(result.scalars().all())

    async def get_by_id(self, user_id: int | str) -> Optional[User]:
        """
        Fetch a user by numeric ID or UUID string.
        Tries integer lookup first, then UUID lookup.
        """
        int_id: Optional[int] = None
        uuid_id: Optional[UUID] = None

        if isinstance(user_id, int):
            int_id = user_id
        else:
            try:
                int_id = int(str(user_id))
            except (ValueError, TypeError):
                int_id = None
            try:
                uuid_id = UUID(str(user_id))
            except (ValueError, TypeError):
                uuid_id = None

        # Try by integer id
        if int_id is not None:
            result = await self.session.execute(select(User).where(User.id == int_id))
            user = result.scalar_one_or_none()
            if user:
                return user

        # Fallback to UUID
        if uuid_id is not None:
            result = await self.session.execute(select(User).where(User.uuid == uuid_id))
            user = result.scalar_one_or_none()
            if user:
                return user

        return None

    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username_or_email(self, username_or_email: str) -> Optional[User]:
        stmt = select(User).where(
            or_(User.username == username_or_email, User.email == username_or_email)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_email_verified(self, user_id: int) -> None:
        await self.session.execute(
            update(User).where(User.id == user_id).values(email_verified=True)
        )

    async def mark_inactive(self, user_id: int) -> None:
        await self.session.execute(
            update(User).where(User.id == user_id).values(status=UserStatus.INACTIVE)
        )


