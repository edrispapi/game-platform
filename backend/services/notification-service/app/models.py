from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Index
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
    
    __table_args__ = (
        Index('idx_user_unread', 'user_id', 'is_read'),
        Index('idx_user_created', 'user_id', 'created_at'),
    )