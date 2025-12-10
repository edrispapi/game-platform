from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Index
import json
from sqlalchemy.sql import func
from .database import Base

class Notification(Base):
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    message = Column(Text, nullable=False)
    category = Column(String(50), default='general')  # game_update, friend_request, purchase, etc.
    priority = Column(String(20), default='normal')  # low, normal, high, urgent
    is_read = Column(Boolean, default=False, nullable=False)
    extra_metadata = Column(Text, default='{}')  # JSON string for flexibility
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Provide optional attributes expected by schemas even if not stored as columns
    @property
    def title(self) -> str | None:
        try:
            meta = json.loads(self.extra_metadata or "{}")
            return meta.get("title")
        except Exception:
            return None

    @property
    def delivered_via(self) -> str:
        return "in-app"

    @property
    def updated_at(self):
        # No explicit updated_at column; reuse created_at for response compatibility
        return self.created_at

    __table_args__ = (
        Index('idx_user_unread', 'user_id', 'is_read'),
        Index('idx_user_created', 'user_id', 'created_at'),
    )