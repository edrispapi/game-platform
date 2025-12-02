"""
Monitoring Service Database Models
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

# Add your models here
# Example:
# class LogEntry(Base):
#     __tablename__ = "logentrys"
#     
#     id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
#     created_at = Column(DateTime, default=datetime.utcnow)
#     updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
