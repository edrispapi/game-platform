"""User Service API Routes."""
from __future__ import annotations

import os
from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_access_token, verify_token
from app.db.session import get_session
from app.models import User
from app.schemas import (
    PasswordChange,
    UserCreate,
    UserLogin,
    UserLoginResponse,
    UserPreferenceCreate,
    UserPreferenceResponse,
    UserResponse,
    UserSessionResponse,
    UserUpdate,
)
from app.services.user_service import UserService
from app.utils.exceptions import ConflictError, NotFoundError, ServiceError

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


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


@router.post("/login", response_model=UserLoginResponse)
async def login_user(
    login_data: UserLogin,
    request: Request,
    service: UserService = Depends(get_user_service),
) -> UserLoginResponse:
    try:
        user = await service.authenticate(login_data)
        await service.update_last_login(user.id)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"user_id": user.id, "username": user.username},
            expires_delta=access_token_expires,
        )
        client = request.client
        device_info = {
            "user_agent": request.headers.get("user-agent"),
            "ip_address": client.host if client else None,
        }
        await service.create_session(
            user_id=user.id,
            token=access_token,
            remember_me=login_data.remember_me,
            device_info=device_info,
            ip_address=device_info["ip_address"],
            user_agent=device_info["user_agent"],
        )
        return UserLoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user,
        )
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