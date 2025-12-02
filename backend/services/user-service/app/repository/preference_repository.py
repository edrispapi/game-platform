"""Persistence helpers for user preferences."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserPreference


class UserPreferenceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self, user_id: int, key: str, value: str | None
    ) -> UserPreference:
        pref = UserPreference(
            user_id=user_id,
            preference_key=key,
            preference_value=value,
        )
        self.session.add(pref)
        await self.session.flush()
        await self.session.refresh(pref)
        return pref

    async def list_for_user(self, user_id: int) -> list[UserPreference]:
        result = await self.session.execute(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )
        return list(result.scalars().all())

    async def get_for_user(
        self, user_id: int, key: str
    ) -> Optional[UserPreference]:
        result = await self.session.execute(
            select(UserPreference).where(
                UserPreference.user_id == user_id,
                UserPreference.preference_key == key,
            )
        )
        return result.scalar_one_or_none()


