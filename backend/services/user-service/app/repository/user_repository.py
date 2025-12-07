"\"\"\"User data access helpers.\"\"\""
from __future__ import annotations

from typing import Optional

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

    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

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


