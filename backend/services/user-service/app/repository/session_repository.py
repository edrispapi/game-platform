"""Persistence helpers for user sessions."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserSession


class UserSessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        user_id: int,
        session_token: str,
        expires_at: datetime,
        device_info: dict | None,
        ip_address: str | None,
        user_agent: str | None,
    ) -> UserSession:
        db_session = UserSession(
            user_id=user_id,
            session_token=session_token,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at,
        )
        self.session.add(db_session)
        await self.session.flush()
        await self.session.refresh(db_session)
        return db_session

    async def get_by_token(self, token: str) -> Optional[UserSession]:
        stmt = select(UserSession).where(
            UserSession.session_token == token,
            UserSession.is_active.is_(True),
            UserSession.expires_at > datetime.now(timezone.utc),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def deactivate_by_token(self, token: str) -> int:
        result = await self.session.execute(
            update(UserSession)
            .where(UserSession.session_token == token)
            .values(is_active=False)
        )
        return result.rowcount or 0

    async def deactivate_all_for_user(self, user_id: int) -> None:
        await self.session.execute(
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.is_active.is_(True),
            )
            .values(is_active=False)
        )

    async def list_active_for_user(self, user_id: int) -> list[UserSession]:
        stmt = select(UserSession).where(
            UserSession.user_id == user_id, UserSession.is_active.is_(True)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


